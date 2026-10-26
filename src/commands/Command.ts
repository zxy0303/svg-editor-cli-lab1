export abstract class Command {
  abstract execute(): readonly string[];
}
