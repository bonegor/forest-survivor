// The play-testing tools run below normal priority unless told otherwise (--priority=normal), so the
// PC stays usable while they fill every core. Workers, threads and child processes inherit it.
import os from 'node:os';

export function setPriority(choice = 'low') {
  if (choice === 'normal') return;
  if (choice !== 'low') throw new Error(`--priority must be low or normal, not "${choice}"`);
  try {
    os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL);
  } catch {
    // Not allowed here: run as is.
  }
}
