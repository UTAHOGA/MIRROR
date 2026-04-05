'use strict';

const moduleA = require('./moduleA');
const moduleB = require('./moduleB');

function initialize() {
    console.log('Application is initializing...');
    moduleA.init();
    moduleB.init();
}

function main() {
    initialize();
    console.log('Application has been initialized successfully.');
}

main();