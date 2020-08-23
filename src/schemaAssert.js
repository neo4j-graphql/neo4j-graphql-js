import { getFieldDirective } from './utils';
import { DirectiveDefinition } from './augment/directives';
import { isNodeType, isUnionTypeDefinition } from './augment/types/types';
import { getKeyFields } from './augment/types/node/selection';

export const schemaAssert = ({
  schema,
  indexLabels,
  constraintLabels,
  dropExisting = true
}) => {
  if (!indexLabels) indexLabels = `{}`;
  if (!constraintLabels) constraintLabels = `{}`;
  if (schema) {
    const indexFieldTypeMap = buildKeyTypeMap({
      schema,
      directives: [DirectiveDefinition.INDEX]
    });
    indexLabels = cypherMap({
      typeMap: indexFieldTypeMap
    });
    const uniqueFieldTypeMap = buildKeyTypeMap({
      schema,
      directives: [DirectiveDefinition.ID, DirectiveDefinition.UNIQUE]
    });
    constraintLabels = cypherMap({
      typeMap: uniqueFieldTypeMap
    });
  }
  return `CALL apoc.schema.assert(${indexLabels}, ${constraintLabels}${
    dropExisting === false ? `, ${dropExisting}` : ''
  })`;
};

const buildKeyTypeMap = ({ schema, directives = [] }) => {
  const typeMap = schema ? schema.getTypeMap() : {};
  return Object.entries(typeMap).reduce(
    (mapped, [typeName, { astNode: definition }]) => {
      if (
        isNodeType({ definition }) &&
        !isUnionTypeDefinition({ definition })
      ) {
        const type = schema.getType(typeName);
        const fieldMap = type.getFields();
        const fields = Object.values(fieldMap).map(field => field.astNode);
        const keyFields = getKeyFields({ fields });
        if (keyFields.length && directives.length) {
          const directiveFields = keyFields.filter(field => {
            // there exists at least one directive on this field
            // matching a directive we want to map
            return directives.some(directive =>
              getFieldDirective(field, directive)
            );
          });
          if (directiveFields.length) {
            mapped[typeName] = {
              ...definition,
              fields: directiveFields
            };
          }
        }
      }
      return mapped;
    },
    {}
  );
};

const cypherMap = ({ typeMap = {} }) => {
  // The format of a Cypher map is close to JSON but does not quote keys
  const cypherMapFormat = Object.entries(typeMap).map(([typeName, astNode]) => {
    const fields = astNode.fields || [];
    const fieldNames = fields.map(field => field.name.value);
    return `${typeName}:${cypherList({ values: fieldNames })}`;
  });
  return `{${cypherMapFormat}}`;
};

const cypherList = ({ values = [] }) => JSON.stringify(values);
