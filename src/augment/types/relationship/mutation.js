import _ from 'lodash';
import { RelationshipDirectionField } from './relationship';
import { buildNodeOutputFields } from './query';
import { shouldAugmentRelationshipField } from '../../augment';
import { OperationType } from '../../types/types';
import { TypeWrappers, getFieldDefinition } from '../../fields';
import {
  DirectiveDefinition,
  buildAuthScopeDirective,
  buildMutationMetaDirective,
  buildRelationDirective,
  useAuthDirective,
  getDirective,
  isCypherField
} from '../../directives';
import {
  buildInputValue,
  buildName,
  buildNamedType,
  buildField,
  buildObjectType,
  buildInputObjectType
} from '../../ast';

export const RelationshipMutation = {
  CREATE: 'Add',
  DELETE: 'Remove'
};

export const augmentRelationshipMutationAPI = ({
  typeName,
  fieldName,
  outputType,
  fromType,
  toType,
  relationshipName,
  propertyInputValues = [],
  propertyOutputFields = [],
  typeDefinitionMap,
  generatedTypeMap,
  operationTypeMap,
  config
}) => {
  const mutationTypeName = OperationType.MUTATION;
  const mutationType = operationTypeMap[mutationTypeName];
  const mutationTypeNameLower = mutationTypeName.toLowerCase();
  if (
    mutationType &&
    shouldAugmentRelationshipField(
      config,
      mutationTypeNameLower,
      fromType,
      toType
    )
  ) {
    Object.values(RelationshipMutation).forEach(mutationAction => {
      const mutationName = buildRelationshipMutationName({
        mutationAction,
        typeName,
        fieldName
      });
      if (
        !getFieldDefinition({
          fields: mutationType.fields,
          name: mutationName
        })
      ) {
        [operationTypeMap, generatedTypeMap] = buildRelationshipMutationAPI({
          mutationAction,
          mutationName,
          relationshipName,
          fromType,
          toType,
          propertyInputValues,
          propertyOutputFields,
          outputType,
          generatedTypeMap,
          operationTypeMap,
          config
        });
      }
    });
  }
  return [typeDefinitionMap, generatedTypeMap, operationTypeMap];
};

const buildNodeSelectionArguments = ({ fromType, toType }) => {
  return [
    buildInputValue({
      name: buildName({
        name: RelationshipDirectionField.FROM
      }),
      type: buildNamedType({
        name: `_${fromType}Input`,
        wrappers: {
          [TypeWrappers.NON_NULL_NAMED_TYPE]: true
        }
      })
    }),
    buildInputValue({
      name: buildName({
        name: RelationshipDirectionField.TO
      }),
      type: buildNamedType({
        name: `_${toType}Input`,
        wrappers: {
          [TypeWrappers.NON_NULL_NAMED_TYPE]: true
        }
      })
    })
  ];
};

const buildRelationshipMutationAPI = ({
  mutationAction,
  mutationName,
  relationshipName,
  fromType,
  toType,
  propertyInputValues,
  propertyOutputFields,
  outputType,
  generatedTypeMap,
  operationTypeMap,
  config
}) => {
  const mutationOutputType = `_${mutationName}Payload`;
  operationTypeMap = buildRelationshipMutationField({
    mutationAction,
    mutationName,
    relationshipName,
    fromType,
    toType,
    propertyOutputFields,
    mutationOutputType,
    outputType,
    operationTypeMap,
    config
  });
  generatedTypeMap = buildRelationshipMutationPropertyInputType({
    mutationAction,
    outputType,
    propertyInputValues,
    generatedTypeMap
  });
  generatedTypeMap = buildRelationshipMutationOutputType({
    mutationAction,
    mutationOutputType,
    propertyOutputFields,
    relationshipName,
    fromType,
    toType,
    generatedTypeMap
  });
  return [operationTypeMap, generatedTypeMap];
};

const buildRelationshipMutationField = ({
  mutationAction,
  mutationName,
  relationshipName,
  fromType,
  toType,
  propertyOutputFields,
  mutationOutputType,
  outputType,
  operationTypeMap,
  config
}) => {
  if (
    mutationAction === RelationshipMutation.CREATE ||
    mutationAction === RelationshipMutation.DELETE
  ) {
    operationTypeMap[OperationType.MUTATION].fields.push(
      buildField({
        name: buildName({
          name: mutationName
        }),
        type: buildNamedType({
          name: mutationOutputType
        }),
        args: buildRelationshipMutationArguments({
          mutationAction,
          fromType,
          toType,
          propertyOutputFields,
          outputType
        }),
        directives: buildRelationshipMutationDirectives({
          mutationAction,
          relationshipName,
          fromType,
          toType,
          propertyOutputFields,
          config
        })
      })
    );
  }
  return operationTypeMap;
};

const buildRelationshipPropertyInputArgument = ({ outputType }) => {
  return buildInputValue({
    name: buildName({ name: 'data' }),
    type: buildNamedType({
      name: `_${outputType}Input`,
      wrappers: {
        [TypeWrappers.NON_NULL_NAMED_TYPE]: true
      }
    })
  });
};

const buildRelationshipMutationPropertyInputType = ({
  mutationAction,
  outputType,
  propertyInputValues,
  generatedTypeMap
}) => {
  if (
    mutationAction === RelationshipMutation.CREATE &&
    propertyInputValues.length
  ) {
    let nonComputedPropertyInputFields = propertyInputValues.filter(field => {
      const cypherDirective = getDirective({
        directives: field.directives,
        name: DirectiveDefinition.CYPHER
      });
      return !cypherDirective;
    });
    const inputTypeName = `_${outputType}Input`;
    generatedTypeMap[inputTypeName] = buildInputObjectType({
      name: buildName({ name: inputTypeName }),
      fields: nonComputedPropertyInputFields.map(inputValue =>
        buildInputValue({
          name: buildName({ name: inputValue.name }),
          type: buildNamedType(inputValue.type)
        })
      )
    });
  }
  return generatedTypeMap;
};

const buildRelationshipMutationArguments = ({
  mutationAction,
  fromType,
  toType,
  propertyOutputFields,
  outputType
}) => {
  const fieldArguments = buildNodeSelectionArguments({ fromType, toType });
  if (
    mutationAction === RelationshipMutation.CREATE &&
    propertyOutputFields.length
  ) {
    fieldArguments.push(
      buildRelationshipPropertyInputArgument({
        outputType
      })
    );
  }
  return fieldArguments;
};

const buildRelationshipMutationDirectives = ({
  mutationAction,
  relationshipName,
  fromType,
  toType,
  propertyOutputFields,
  config
}) => {
  const mutationMetaDirective = buildMutationMetaDirective({
    relationshipName,
    fromType,
    toType
  });
  const directives = [mutationMetaDirective];
  if (propertyOutputFields.length) {
    if (useAuthDirective(config, DirectiveDefinition.HAS_SCOPE)) {
      directives.push(
        buildAuthScopeDirective({
          scopes: [
            {
              typeName: fromType,
              mutation: `Create`
            },
            {
              typeName: toType,
              mutation: `Create`
            }
          ]
        })
      );
    }
  } else if (mutationAction === RelationshipMutation.DELETE) {
    if (useAuthDirective(config, DirectiveDefinition.HAS_SCOPE)) {
      directives.push(
        buildAuthScopeDirective({
          scopes: [
            {
              typeName: fromType,
              mutation: `Delete`
            },
            {
              typeName: toType,
              mutation: `Delete`
            }
          ]
        })
      );
    }
  }
  return directives;
};

const buildRelationshipMutationOutputType = ({
  mutationAction,
  mutationOutputType,
  propertyOutputFields,
  relationshipName,
  fromType,
  toType,
  generatedTypeMap
}) => {
  if (
    mutationAction === RelationshipMutation.CREATE ||
    mutationAction === RelationshipMutation.DELETE
  ) {
    const relationTypeDirective = buildRelationDirective({
      relationshipName,
      fromType,
      toType
    });
    let fields = buildNodeOutputFields({ fromType, toType });
    if (mutationAction === RelationshipMutation.CREATE) {
      // console.log("mutationOutputType: ", mutationOutputType);
      // TODO temporary block on cypher field arguments
      const mutationOutputFields = propertyOutputFields.map(field => {
        if (isCypherField({ directives: field.directives })) {
          return {
            ...field,
            arguments: []
          };
        } else return field;
      });
      fields.push(...mutationOutputFields);
    }
    generatedTypeMap[mutationOutputType] = buildObjectType({
      name: buildName({ name: mutationOutputType }),
      fields,
      directives: [relationTypeDirective]
    });
  }
  return generatedTypeMap;
};

const buildRelationshipMutationName = ({
  mutationAction,
  typeName,
  fieldName
}) =>
  `${mutationAction}${typeName}${fieldName[0].toUpperCase() +
    fieldName.substr(1)}`;
