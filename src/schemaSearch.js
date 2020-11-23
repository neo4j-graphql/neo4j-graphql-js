import { getFieldDirective } from './utils';
import {
  DirectiveDefinition,
  getDirective,
  getDirectiveArgument
} from './augment/directives';
import { isNodeType, isUnionTypeDefinition } from './augment/types/types';
import { TypeWrappers, unwrapNamedType } from './augment/fields';
import { GraphQLID, GraphQLString } from 'graphql';
import { ApolloError } from 'apollo-server-errors';

const CREATE_NODE_INDEX = `CALL db.index.fulltext.createNodeIndex`;

export const schemaSearch = ({ schema }) => {
  let statement = '';
  let statements = [];
  if (schema) {
    const searchFieldTypeMap = mapSearchDirectives({
      schema
    });
    statements = Object.entries(searchFieldTypeMap).map(([name, config]) => {
      const { labelMap, properties } = config;
      const labels = Object.keys(labelMap);
      const labelVariable = JSON.stringify(labels);
      const propertyVariable = JSON.stringify(properties);
      // create the index anew
      return `  ${CREATE_NODE_INDEX}("${name}",${labelVariable},${propertyVariable})`;
    });
  }
  if (statements.length) {
    statement = `${statements.join('\n')}
  RETURN TRUE`;
  }
  return statement;
};

export const mapSearchDirectives = ({ schema }) => {
  const typeMap = schema ? schema.getTypeMap() : {};
  return Object.entries(typeMap).reduce(
    (mapped, [typeName, { astNode: definition }]) => {
      if (
        isNodeType({ definition }) &&
        !isUnionTypeDefinition({ definition })
      ) {
        const type = schema.getType(typeName);
        const fieldMap = type.getFields();
        Object.entries(fieldMap).forEach(([name, field]) => {
          const { astNode } = field;
          if (astNode) {
            const unwrappedType = unwrapNamedType({ type: astNode.type });
            const fieldTypeName = unwrappedType.name;
            const fieldTypeWrappers = unwrappedType.wrappers;
            const directives = astNode.directives;
            const directive = getDirective({
              directives,
              name: DirectiveDefinition.SEARCH
            });
            if (directive) {
              const isStringType = fieldTypeName === GraphQLString.name;
              const isIDType = fieldTypeName === GraphQLID.name;
              const isListField = fieldTypeWrappers[TypeWrappers.LIST_TYPE];
              if (isIDType || isStringType) {
                if (!isListField) {
                  let searchIndexName = getDirectiveArgument({
                    directive,
                    name: 'index'
                  });
                  if (!searchIndexName) searchIndexName = `${typeName}Search`;
                  if (!mapped[searchIndexName]) {
                    mapped[searchIndexName] = {
                      labelMap: {
                        [typeName]: true
                      },
                      properties: [name]
                    };
                  } else {
                    const indexEntry = mapped[searchIndexName];
                    const labelMap = indexEntry.labelMap;
                    const firstLabel = Object.keys(labelMap)[0];
                    if (labelMap[typeName]) {
                      mapped[searchIndexName].properties.push(name);
                    } else {
                      throw new ApolloError(
                        `The ${searchIndexName} index on the ${firstLabel} type cannot be used on the ${name} field of the ${typeName} type, because composite search indexes are not yet supported.`
                      );
                    }
                  }
                } else {
                  throw new ApolloError(
                    `The @search directive on the ${name} field of the ${typeName} type is invalid, because search indexes cannot currently be set for list type fields.`
                  );
                }
              } else {
                throw new ApolloError(
                  `The @search directive on the ${name} field of the ${typeName} type is invalid, because search indexes can only be set for String and ID type fields.`
                );
              }
            }
          }
        });
      }
      return mapped;
    },
    {}
  );
};
