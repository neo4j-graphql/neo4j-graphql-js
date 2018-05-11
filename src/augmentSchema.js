import { makeExecutableSchema, mergeSchemas } from 'graphql-tools';
import { neo4jgraphql } from './index';
import { printSchema } from 'graphql';

export function addMutationsToSchema(schema) {
  const types = typesToAugment(schema);

  // FIXME: don't use printSchema (custom directives are lost), instead use extend schema
  // FIXME: type extensions are lost
  let mutationSchemaSDL = printSchema(schema);

  // TODO: compose augment funcs
  //let mutationSchemaSDLWithTypes = augmentTypes(types, schema, mutationSchemaSDL);

  let mutationSchemaSDLWithTypesAndMutations = augmentMutations(
    types,
    schema,
    mutationSchemaSDL
  );
  //console.log(mutationSchemaSDLWithTypesAndMutations);

  let resolvers = types.reduce(
    (acc, t) => {
      // FIXME: inspect actual mutations, not construct mutation names here
      acc.Mutation[`Create${t}`] = neo4jgraphql;
      types.forEach(t => {
        addRelationshipMutations(schema.getTypeMap()[t], true).forEach(m => {
          acc.Mutation[m] = neo4jgraphql;
        });
      });

      return acc;
    },
    { Mutation: {}, Query: {} }
  );

  // delegate query resolvers to original schema
  resolvers = Object.keys(schema.getQueryType().getFields()).reduce(
    (acc, t) => {
      acc.Query[t] = (obj, args, context, info) => {
        return info.mergeInfo.delegateToSchema({
          schema: schema,
          operation: 'query',
          fieldName: t,
          args,
          context,
          info
        });
      };
      return acc;
    },
    resolvers
  );

  const mutationSchema = makeExecutableSchema({
    typeDefs: mutationSchemaSDLWithTypesAndMutations,
    resolvers
  });

  const onTypeConflict = (left, right, info) => {
    // FIXME: throws away type extensions
    return left;
  };

  // TODO: ensure onTypeConflict is handled correctly
  // see: https://www.apollographql.com/docs/graphql-tools/schema-stitching.html#mergeSchemas
  const finalSchema = mergeSchemas({
    schemas: [schema, mutationSchema],
    resolvers,
    onTypeConflict
  });

  return finalSchema;
}

/**
 * Given a GraphQLSchema return an array of the type names,
 * excluding Query and Mutation types
 * @param {GraphQLSchema} schema
 * @returns {string[]}
 */
function typesToAugment(schema) {
  // TODO: check for @ignore and @model directives
  return Object.keys(schema.getTypeMap()).filter(
    t =>
      schema.getTypeMap()[t].astNode === undefined
        ? false
        : schema.getTypeMap()[t].astNode.kind === 'ObjectTypeDefinition' &&
          t !== 'Query' &&
          t !== 'Mutation'
  );
}

/**
 * Generate type extensions for each type:
 *   - add _id field
 * @param {string[]} types
 * @param schema
 * @param {string} sdl
 * @returns {string} SDL type extensions
 */
function augmentTypes(types, schema, sdl) {
  return types.reduce((acc, t) => {
    if (t === 'Mutation' || t === 'Query') {
      return acc + '';
    } else {
      return (
        acc +
        `
    
    extend type ${t} {
      _id: ID
    }
    `
      );
    }
  }, sdl);
}

function augmentMutations(types, schema, sdl) {
  // FIXME: requires placeholder Query type
  return (
    sdl +
    `
    extend schema {
      mutation: Mutation
    }

  
    type Mutation {
  
    ${types.reduce((acc, t) => {
      return (
        acc +
        `
      ${createMutation(schema.getTypeMap()[t])}
      ${addRelationshipMutations(schema.getTypeMap()[t])} 
    `
      );
    }, '')}

  }`
  );
}

function createMutation(type) {
  return `Create${type.name}(${paramSignature(type)}): ${type.name}`;
}

function addRelationshipMutations(type, namesOnly = false) {
  let mutations = ``;
  let mutationNames = [];

  let relationshipFields = Object.keys(type.getFields()).filter(x => {
    for (let i = 0; i < type.getFields()[x].astNode.directives.length; i++) {
      if (type.getFields()[x].astNode.directives[i].name.value === 'relation') {
        return true;
      }
    }
  });

  relationshipFields.forEach(x => {
    let relationDirective = type.getFields()[x].astNode.directives.filter(d => {
      return d.name.value === 'relation';
    })[0];

    let relTypeArg, directionArg, fromType, toType;

    try {
      relTypeArg = relationDirective.arguments.filter(a => {
        return a.name.value === 'name';
      })[0];
    } catch (e) {
      throw new Error(`No name argument specified on @relation directive`);
    }

    try {
      directionArg = relationDirective.arguments.filter(a => {
        return a.name.value === 'direction';
      })[0];
    } catch (e) {
      // FIXME: should we ignore this error to define default behavior?
      throw new Error('No direction argument specified on @relation directive');
    }

    if (
      directionArg.value.value === 'OUT' ||
      directionArg.value.value === 'out'
    ) {
      fromType = type;
      toType = innerType(type.getFields()[x].type);
    } else {
      fromType = innerType(type.getFields()[x].type);
      toType = type;
      return; // don't create duplicate definition of mutation (only for one direction)
    }

    let fromPk = primaryKey(fromType);
    let toPk = primaryKey(toType);

    // FIXME: could add relationship properties here
    mutations += `
    Add${fromType.name}${toType.name}(${fromPk.name}: ${
      innerType(fromPk.type).name
    }!, ${toPk.name}: ${innerType(toPk.type).name}!): ${
      fromType.name
    } @MutationMeta(relationship: "${relTypeArg.value.value}", from: "${
      fromType.name
    }", to: "${toType.name}")
    `;

    mutationNames.push(`Add${fromType.name}${toType.name}`);
  });

  if (namesOnly) {
    return mutationNames;
  } else {
    return mutations;
  }
}

/**
 * Returns the field to be treated as the "primary key" for this type
 * Primary key is determined as the first of:
 *   - non-null ID field
 *   - ID field
 *   - first String field
 *   - first field
 *
 * @param {ObjectTypeDefinition} type
 * @returns {FieldDefinition} primary key field
 */
function primaryKey(type) {
  // Find the primary key for the type
  // first field with a required ID
  // if no required ID type then first required type

  let pk = firstNonNullAndIdField(type);
  if (!pk) {
    pk = firstIdField(type);
  }

  if (!pk) {
    pk = firstNonNullField(type);
  }

  if (!pk) {
    pk = firstField(type);
  }
  return pk;
}

function paramSignature(type) {
  return Object.keys(type.getFields()).reduce((acc, f) => {
    if (
      f === '_id' ||
      (innerType(type.getFields()[f].type).astNode &&
        innerType(type.getFields()[f].type).astNode.kind ===
          'ObjectTypeDefinition')
    ) {
      // TODO: exclude @cypher fields
      // TODO: exclude object types?
      return acc + '';
    } else {
      return acc + ` ${f}: ${innerType(type.getFields()[f].type).name},`;
    }
  }, '');
}

function innerType(type) {
  return type.ofType ? innerType(type.ofType) : type;
}

function firstNonNullAndIdField(type) {
  let fields = Object.keys(type.getFields()).filter(t => {
    return (
      type.getFields()[t].type.constructor.name === 'GraphQLNonNull' &&
      innerType(type.getFields()[t].type.name === 'ID')
    );
  });

  if (fields.length === 0) {
    return undefined;
  } else {
    return type.getFields()[fields[0]];
  }
}

function firstIdField(type) {
  let fields = Object.keys(type.getFields()).filter(t => {
    return innerType(type.getFields()[t].type.name === 'ID');
  });

  if (fields.length === 0) {
    return undefined;
  } else {
    return type.getFields()[fields[0]];
  }
}

function firstNonNullField(type) {
  let fields = Object.keys(type.getFields()).filter(t => {
    return type.getFields()[t].type.constructor.name === 'GraphQLNonNull';
  });

  if (fields.length === 0) {
    return undefined;
  } else {
    return type.getFields()[fields[0]];
  }
}

function firstField(type) {
  return type.getFields()[Object.keys(type.getFields())[0]];
}
