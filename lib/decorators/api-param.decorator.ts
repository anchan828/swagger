import { Type } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { isConstructor } from '@nestjs/common/utils/shared.utils';
import { isNil, omit } from 'lodash';
import {
  ParameterObject,
  SchemaObject
} from '../interfaces/open-api-spec.interface';
import { SwaggerEnumType } from '../types/swagger-enum.type';
import { getEnumType, getEnumValues } from '../utils/enum.utils';
import { createParamDecorator } from './helpers';

type ParameterOptions = Omit<ParameterObject, 'in' | 'schema'>;

interface ApiParamMetadata extends ParameterOptions {
  type?: Type<unknown> | Function | [Function] | string;
  enum?: SwaggerEnumType;
  enumName?: string;
}

interface ApiParamSchemaHost extends ParameterOptions {
  schema: SchemaObject;
}

export type ApiParamOptions = ApiParamMetadata | ApiParamSchemaHost;

const defaultParamOptions: ApiParamOptions = {
  name: '',
  required: true
};

export function ApiParam(
  options: ApiParamOptions
): MethodDecorator & ClassDecorator {
  const param: Record<string, any> = {
    name: isNil(options.name) ? defaultParamOptions.name : options.name,
    in: 'path',
    ...omit(options, 'enum')
  };

  const apiParamMetadata = options as ApiParamMetadata;
  if (apiParamMetadata.enum) {
    param.schema = param.schema || ({} as SchemaObject);

    const paramSchema = param.schema as SchemaObject;
    const enumValues = getEnumValues(apiParamMetadata.enum);
    paramSchema.type = getEnumType(enumValues);
    paramSchema.enum = enumValues;

    if (apiParamMetadata.enumName) {
      param.enumName = apiParamMetadata.enumName;
    }
  }

  return (
    target: object | Function,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>
  ): any => {
    if (descriptor) {
      return createParamDecorator(param, defaultParamOptions)(
        target,
        key,
        descriptor
      );
    }

    if (typeof target === 'object') {
      return target;
    }

    const propertyKeys = Object.getOwnPropertyNames(target.prototype);

    for (const propertyKey of propertyKeys) {
      if (isConstructor(propertyKey)) {
        continue;
      }

      const descriptor = Object.getOwnPropertyDescriptor(
        target.prototype,
        propertyKey
      );

      if (!descriptor) {
        continue;
      }

      const isApiMethod = Reflect.hasMetadata(
        METHOD_METADATA,
        descriptor.value
      );

      if (isApiMethod) {
        createParamDecorator(param, defaultParamOptions)(
          target.prototype,
          propertyKey,
          descriptor
        );
      }
    }
  };
}
