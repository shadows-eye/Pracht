import calculateFunke from './lib/pracht.mjs';
import constants from './lib/constants.mjs';

const MODULE_ID = constants.MODULE_ID;

// ===================================================================
// HOOKS
// ===================================================================

Hooks.once('init', function() {
    console.log(`${MODULE_ID} | Initializing SR5 Pracht Module`);
});

Hooks.once('ready', async function() {
    console.log(`${MODULE_ID} | SR5 Pracht Module is Ready`);
    
    for (const actor of game.actors) {
        if (actor.type === 'character') {
            const funkeValue = calculateFunke(actor);
            // --- FIX: Update BOTH submersion paths ---
            if (actor.system.attributes.submersion.base !== funkeValue) {
                await actor.update({ 
                    'system.attributes.submersion.base': funkeValue,
                    'system.technomancer.submersion': funkeValue
                });
            }
        }
    }
});

Hooks.on('createActor', async (actor, options, userId) => {
    if (userId !== game.user.id) return;

    if (actor.type === 'character') {
        console.log(`${MODULE_ID} | New character created. Calculating initial Funke value.`);
        const funkeValue = calculateFunke(actor);
        
        // --- FIX: Update BOTH submersion paths for new actors ---
        await actor.update({ 
            'system.attributes.submersion.base': funkeValue,
            'system.technomancer.submersion': funkeValue
        });
    }
});

Hooks.on('preUpdateActor', async (actor, changes) => {
    if (actor.type !== 'character') return;

    const freshActor = await fromUuid(actor.uuid);
    if (!freshActor) return;

    console.log(`${MODULE_ID} | Funke (Submersion) base value BEFORE update:`, freshActor.system.attributes.submersion.base);

    const prachtChangePath = 'system.attributes.resonance.base';
    if (foundry.utils.hasProperty(changes, prachtChangePath)) {
        let prachtValue = foundry.utils.getProperty(changes, prachtChangePath);
        const sanitizedPracht = parseInt(prachtValue, 10);
        foundry.utils.setProperty(changes, prachtChangePath, isNaN(sanitizedPracht) ? 0 : sanitizedPracht);
    }

    const relevantChange = Object.keys(foundry.utils.flattenObject(changes)).some(key => 
        key.startsWith('system.attributes') &&
        key.endsWith('.base') &&
        !key.includes('submersion')
    );

    if (relevantChange) {
        const updatedActorData = foundry.utils.mergeObject(freshActor.toObject(), changes);
        const tempActor = new Actor.implementation(updatedActorData); 
        const newFunkeValue = calculateFunke(tempActor);
        
        // --- FIX: Update BOTH submersion paths during recalculation ---
        foundry.utils.setProperty(changes, 'system.attributes.submersion.base', newFunkeValue);
        foundry.utils.setProperty(changes, 'system.technomancer.submersion', newFunkeValue);

        console.log(`${MODULE_ID} | Funke (Submersion) base value AFTER recalculation:`, newFunkeValue);
    }
});

Hooks.on('renderSR5CharacterSheet', (app, html, data) => {
    if (app.actor.type !== 'character') return;

    const specialAttributesSection = html.find('.split-container .flexcol .attributes.center');
    if (specialAttributesSection.length === 0) return;

    specialAttributesSection.find('.attribute[data-attribute="resonance"]').hide();
    specialAttributesSection.find('.attribute[data-attribute="submersion"]').hide(); 
    html.find('input[name="system.technomancer.submersion"]').closest('.attribute').hide();

    if (specialAttributesSection.find('.pracht-funke-container').length > 0) return;

    const prachtValue = data.actor.system.attributes.resonance.base;
    const funkeValue = data.actor.system.attributes.submersion.value; 
    const prachtLabel = game.i18n.localize("SR5-Pracht.PRACHT");
    const funkeLabel = game.i18n.localize("SR5-Pracht.FUNKE");

    const newAttributesHTML = `
        <div class="pracht-funke-container">
            <div class="pracht-container attribute">
                <label class="attribute-name roll Roll" title="${prachtLabel}" data-roll-attribute="resonance"><i class="fas fa-sun"></i></label>
                <div class="attribute-value">
                     <div class="attribute-input-container">
                        <input class="display attribute-input short" type="text" data-tooltip="${prachtLabel}" maxlength="2" size="2" name="system.attributes.resonance.base" value="${prachtValue}" data-dtype="Number" placeholder="">
                    </div>
                </div>
            </div>
            <div class="funke-container attribute">
                <label class="attribute-name roll Roll" title="${funkeLabel}" data-roll-attribute="submersion"><i class="fas fa-fire"></i></label>
                <div class="attribute-value">
                    <span class="attribute-value-display">${funkeValue}</span>
                </div>
            </div>
        </div>
    `;
    
    specialAttributesSection.prepend(newAttributesHTML);

    // --- SIMPLIFIED EVENT LISTENER ---
    html.find('.pracht-funke-container .attribute-name').on('click', (event) => {
        event.preventDefault();
        const element = event.currentTarget;
        const attributeName = element.dataset.rollAttribute;

        if (attributeName) {
            console.log(`${MODULE_ID} | Click detected, calling actor.rollAttribute for: ${attributeName}`);
            
            // This single line replaces the entire previous block.
            // It calls the function you found directly on the actor object.
            app.actor.rollAttribute(attributeName, { event: event });
        }
    });
});