import constants from './constants.mjs';

const MODULE_ID = constants.MODULE_ID;

/**
 * Calculates the value for the "Funke" attribute.
 * Funke is the sum of the two highest physical or mental attributes.
 * @param {Actor} actor The actor document to calculate for.
 * @returns {number} The calculated value of Funke.
 */
export default function calculateFunke(actor) {
    const attributes = actor.system.attributes;
    const attributeValues = [
        attributes.body.base,
        attributes.agility.base,
        attributes.reaction.base,
        attributes.strength.base,
        attributes.willpower.base,
        attributes.logic.base,
        attributes.intuition.base,
        attributes.charisma.base
    ];
    attributeValues.sort((a, b) => b - a);
    const funkeValue = (attributeValues[0] || 0) + (attributeValues[1] || 0);
    return funkeValue;
}