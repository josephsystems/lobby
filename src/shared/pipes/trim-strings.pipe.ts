import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * Recursively trims every string value in the incoming request body, query, or param.
 * Applied globally so individual DTOs don't need per-field @Transform() decorators.
 *
 * Handles plain strings, arrays, and nested plain objects. Class instances (Date, Buffer,
 * Map, etc.) are passed through untouched. Circular references and shared sub-objects
 * are safe — each object is processed once and the same output reference is reused.
 */
@Injectable()
export class TrimStringsPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    const { type } = metadata;

    if (type !== 'body' && type !== 'query' && type !== 'param') {
      return value;
    }

    return this.trimDeep(value);
  }

  private trimDeep(
    value: unknown,
    depth = 0,
    seen = new WeakMap<object, unknown>()
  ): unknown {
    if (typeof value === 'string') return value.trim();

    if (Array.isArray(value)) {
      if (seen.has(value)) return seen.get(value);
      if (depth > 50) return value; // abort — untrimmed is safer than a stack overflow
      const result: unknown[] = [];
      seen.set(value, result);
      for (const item of value) {
        result.push(this.trimDeep(item, depth + 1, seen));
      }
      return result;
    }

    if (value !== null && typeof value === 'object') {
      // Only process plain objects — Date, Buffer, Map, Set, and class instances
      // are passed through as-is to avoid stripping their prototype and internal state.
      const proto = Object.getPrototypeOf(value);
      if (proto !== Object.prototype && proto !== null) {
        return value;
      }

      if (seen.has(value as object)) return seen.get(value as object);
      if (depth > 50) return value; // abort — untrimmed is safer than a stack overflow

      const trimmed: Record<string, unknown> = {};
      seen.set(value as object, trimmed);

      for (const [key, val] of Object.entries(value)) {
        // JSON.parse('{"__proto__": {...}}') produces an own enumerable "__proto__" key.
        // Assigning it onto a plain object would mutate its prototype.
        if (key === '__proto__') continue;
        trimmed[key] = this.trimDeep(val, depth + 1, seen);
      }

      return trimmed;
    }

    return value;
  }
}
