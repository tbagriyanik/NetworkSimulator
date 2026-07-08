
import { parseCommand, validateCommand } from './src/lib/network/parser';
import { CommandMode } from './src/lib/network/types';

const input = 'ping  192.168.1.1';
const mode: CommandMode = 'privileged';

const parsed = parseCommand(input, mode);
if (parsed) {
    const validated = validateCommand(parsed, mode);
    console.log('Input:', JSON.stringify(input));
    console.log('Valid:', validated.valid);
    if (!validated.valid) {
        console.log('Error:', validated.error);
    }
} else {
    console.log('Could not parse');
}
