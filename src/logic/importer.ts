import { Logic } from './loader';

export function importDefinitions(logic: Logic): Logic {
  if (logic.errors.length > 0) {
    return logic;
  }
  return logic;
}
