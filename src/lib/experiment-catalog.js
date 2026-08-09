/* eslint-disable import/no-commonjs, max-len, object-property-newline, newline-per-chained-call */
const crypto = require('crypto');

const normalizePrompt = prompt => String(prompt || '')
    .split(/\nUser request:\s*/i)
    .pop()
    .normalize('NFKC')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/g, '');

const EXPERIMENTS = [
    {
        id: 'EXP-001', difficulty: 'Easy',
        prompt: 'Say “Hello!” for 2 seconds, then move 100 steps.',
        aliases: [
            'Say “Hello!” for 2 seconds, then move 100 steps',
            'Say Hello for 2 seconds then move 100 steps',
            'Say Hello for 2 seconds, then move 100 steps.',
            'Say ‘Hello!'
        ]
    },
    {
        id: 'EXP-002', difficulty: 'Easy',
        prompt: 'Move from right to left indefinitely and back again.',
        aliases: [
            'Move from the right to left indefinitely and go back',
            'Start moving from right to left indefinitely and vice versa',
            'Make the cat move indefinitely from the left to the right and vice versa'
        ]
    },
    {
        id: 'EXP-003', difficulty: 'Easy', prompt: 'Move the cat 10 steps.',
        aliases: ['Make the cat move 10 steps', 'make the cat move 10 steps', 'move 10 steps']
    },
    {id: 'EXP-004', difficulty: 'Easy', prompt: 'Add a little wait between each move.'},
    {
        id: 'EXP-005', difficulty: 'Easy',
        prompt: 'When Space is pressed, move upward and then fall back to the starting position. Prevent another jump while airborne.'
    },
    {
        id: 'EXP-006', difficulty: 'Easy',
        prompt: 'Move horizontally between two fixed x-coordinates without using edge-bounce blocks.'
    },
    {
        id: 'EXP-007', difficulty: 'Easy',
        prompt: 'Start at 50% size, grow whenever clicked, and reset after reaching 150%.'
    },
    {
        id: 'EXP-008', difficulty: 'Easy',
        prompt: 'Give the player 15 seconds to click the randomly moving sprite as many times as possible.'
    },
    {
        id: 'EXP-009', difficulty: 'Easy',
        prompt: 'Move across the Stage while repeatedly switching between two costumes.'
    },
    {
        id: 'EXP-010', difficulty: 'Medium',
        prompt: 'Apply vertical velocity and gravity continuously. Allow jumping only while the sprite is on the ground.',
        aliases: [
            'Apply vertical velocity and gravity continuously. Allow jumping -on space click- only while the sprite is on the ground.'
        ]
    },
    {
        id: 'EXP-011', difficulty: 'Medium',
        prompt: 'Ask for two numbers and an operation: +, -, * or /. Calculate and say the result. Prevent division by zero.'
    },
    {
        id: 'EXP-012', difficulty: 'Medium',
        prompt: 'Ask the user for a number. Count down from that number to zero, saying each value for one second, then say “Finished!”.'
    },
    {
        id: 'EXP-013', difficulty: 'Medium',
        prompt: 'Choose a random number between 1 and 20. Repeatedly ask the player to guess it and say “Too high” or “Too low” until the answer is correct. Count the attempts.'
    },
    {
        id: 'EXP-014', difficulty: 'Medium',
        prompt: 'Continuously calculate the distance to the mouse pointer. Say “Near” below 50, “Medium” from 50 to 149 and “Far” at 150 or above.'
    },
    {id: 'EXP-015', difficulty: 'Medium', prompt: 'Continuously move 10 steps and bounce when touching an edge.'},
    {
        id: 'EXP-016', difficulty: 'Medium',
        prompt: 'Continuously move 8 steps. Whenever the sprite touches an edge, bounce and apply a random colour effect.'
    },
    {
        id: 'EXP-017', difficulty: 'Medium',
        prompt: 'Continuously move the sprite. Press the up arrow to increase its speed by 1 and the down arrow to decrease it by 1. Never allow the speed to become negative.'
    },
    {id: 'EXP-018', difficulty: 'Medium', prompt: 'Continuously point towards the mouse pointer and move toward it.'},
    {id: 'EXP-019', difficulty: 'Medium', prompt: 'Every 2 seconds, move to a random position and briefly change colour.'},
    {
        id: 'EXP-020', difficulty: 'Medium',
        prompt: 'Implement horizontal movement, acceleration, friction, gravity, jumping, coloured-platform collision, lives, and a finish area using one sprite and a backdrop.'
    },
    {id: 'EXP-021', difficulty: 'Medium', prompt: 'Increase a score variable whenever the sprite is clicked and display the new score.'},
    {id: 'EXP-022', difficulty: 'Medium', prompt: 'Move 50 steps, turn 180 degrees, then move 50 steps again.'},
    {id: 'EXP-023', difficulty: 'Medium', prompt: 'Move left, right, up, or down when the corresponding arrow key is pressed.'},
    {
        id: 'EXP-024', difficulty: 'Medium',
        prompt: 'Press Space to start or pause a stopwatch. Press R to reset it. Continuously display the elapsed time through a variable.'
    },
    {
        id: 'EXP-025', difficulty: 'Medium',
        prompt: 'Press the left and right arrows to rotate the sprite. Press Space to move 20 steps in its current direction.'
    },
    {id: 'EXP-026', difficulty: 'Medium', prompt: 'Say “Let’s go!”, play a sound, move 40 steps, then change colour.'},
    {
        id: 'EXP-027', difficulty: 'Medium',
        prompt: 'Wait for a random delay, display a signal by changing costume, and measure how quickly the player presses Space. Penalise early presses.'
    },
    {
        id: 'EXP-028', difficulty: 'Medium',
        prompt: 'When the green flag is clicked, set the sprite to (0, 0). Move it 20 steps right, 20 steps up, 20 steps left and 20 steps down repeatedly.'
    },
    {
        id: 'EXP-029', difficulty: 'Medium',
        prompt: 'Whenever the sprite is clicked, move it to a random position, increase the score by 1 and briefly say the current score.',
        aliases: [
            'Whenever the sprite is clicked move it to a random position increase the score by 1 and briefly say the current score'
        ]
    },
    {
        id: 'EXP-030', difficulty: 'Hard',
        prompt: 'Make jump height depend on how long Space is held. Releasing Space early should reduce upward velocity. Include gravity, a ground check and prevention of mid-air jumping.'
    },
    {
        id: 'EXP-031', difficulty: 'Hard',
        prompt: 'Simulate horizontal velocity, vertical velocity, gravity and fuel. Use arrow keys to fire thrusters. Land safely near the bottom only when both velocity values are within safe limits.'
    },
    {
        id: 'EXP-032', difficulty: 'Hard',
        prompt: 'Move using arrow keys and store every position in two lists. Press U to return to the previous recorded position, allowing multiple movements to be undone.'
    },
    {
        id: 'EXP-033', difficulty: 'Hard',
        prompt: 'Generate a sequence of target times. The player must press Space close to each target time. Award more points for smaller timing differences and report the final accuracy.'
    },
    {
        id: 'EXP-034', difficulty: 'Hard',
        prompt: 'Give the sprite health, energy and multiple states: idle, attacking, defending, stunned and defeated. Use different keys for attack and defence, add cooldowns, calculate damage and change behaviour based on current health.'
    },
    {
        id: 'EXP-035', difficulty: 'Hard',
        prompt: 'Implement idle, hungry, happy, sleeping and sick states. Hunger increases over time, energy decreases while awake, and keyboard actions feed, play with or rest the pet. Change costume or effects to represent each state.'
    },
    {id: 'EXP-036', difficulty: 'Hard', prompt: 'Implement a Flappy Bird game.'}
];

const byPrompt = new Map();
for (const experiment of EXPERIMENTS) {
    for (const prompt of [experiment.prompt].concat(experiment.aliases || [])) {
        byPrompt.set(normalizePrompt(prompt), experiment);
    }
}

const getExperiment = prompt => {
    const normalized = normalizePrompt(prompt);
    const known = byPrompt.get(normalized);
    if (known) return known;
    return {
        id: `EXP-U${crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 10).toUpperCase()}`,
        difficulty: null,
        prompt: String(prompt || '').split(/\nUser request:\s*/i).pop().trim()
    };
};

module.exports = {EXPERIMENTS, getExperiment, normalizePrompt};
