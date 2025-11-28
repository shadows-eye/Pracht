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

Hooks.on('renderSR5CharacterSheet', (app, htmlElement, data) => {
    const html = $(htmlElement);

    if (app.actor.type !== 'character') return;

    // 1. Locate the container (anchoring to Magic)
    const magicAttribute = html.find('.tab[data-tab="skills"] .attributes .attribute[data-attribute-id="magic"]');
    const attributesContainer = html.find('.tab[data-tab="skills"] .attributes');
    
    // Safety: If we can't find the container, stop.
    if (attributesContainer.length === 0) return;

    // 2. Hide original Resonance/Submersion
    html.find('[data-attribute-id="resonance"]').hide();
    html.find('[data-attribute-id="submersion"]').hide();
    
    // 3. Check for existing injection
    if (html.find('.pracht-node').length > 0) return;

    // 4. Prepare Data
    const prachtValue = app.actor.system.attributes.resonance.base;
    const funkeValue = app.actor.system.attributes.submersion.value; 
    
    const prachtLabel = game.i18n.localize("SR5-Pracht.PRACHT"); 
    const funkeLabel = game.i18n.localize("SR5-Pracht.FUNKE");

    const isEditMode = app.isEditMode;

    // -------------------------------------------------------
    // HTML GENERATION HELPERS
    // -------------------------------------------------------
    
    // Helper to generate the inner value HTML (Button vs Input)
    const buildValueHtml = (val, name, key, icon) => {
        if (isEditMode) {
            // EDIT MODE: Matches the system's <input type="number" class="short skinny center">
            return `
                <input type="number" 
                       name="${name}" 
                       value="${val}" 
                       step="1" 
                       class="short skinny center">
            `;
        } else {
            // VIEW MODE: Matches the system's <button class="icon sr5-icon">
            // We add a custom class (e.g. 'pracht-roll') to attach our own listener
            return `
                <button class="icon sr5-icon ${key}-roll" type="button">
                    ${val}
                </button>
            `;
        }
    };

    // Helper to generate the Label HTML
    const buildLabelHtml = (label, iconClass, key) => {
        // In Edit Mode, the system adds the 'edit-mode' class to the label
        const cssClass = isEditMode ? "edit-mode" : `${key}-roll-label`; 
        const style = isEditMode ? "" : "cursor: pointer;";
        
        return `
            <label class="${cssClass}" style="${style}">
                 <i class="${iconClass}"></i> ${label}
            </label>
        `;
    };

    // -------------------------------------------------------
    // CONSTRUCT HTML
    // -------------------------------------------------------

    // Pracht (Resonance)
    const prachtHtml = `
        <div class="attribute pracht-node" data-attribute-id="resonance">
            ${buildLabelHtml(prachtLabel, "fas fa-sun", "pracht")}
            <div class="attribute-value">
                ${buildValueHtml(prachtValue, "system.attributes.resonance.base", "pracht")}
            </div>
        </div>
    `;

    // Funke (Submersion)
    // Note: We bind the input to 'system.attributes.submersion.value' so edits save automatically
    const funkeHtml = `
        <div class="attribute funke-node" data-attribute-id="submersion">
            ${buildLabelHtml(funkeLabel, "fas fa-fire", "funke")}
            <div class="attribute-value">
                ${buildValueHtml(funkeValue, "system.attributes.submersion.value", "funke")}
            </div>
        </div>
    `;

    // 5. Inject HTML
    if (magicAttribute.length > 0) {
        // Insert after Magic: Magic -> Funke -> Pracht (based on your previous pref, or swap lines)
        magicAttribute.after(funkeHtml); 
        magicAttribute.after(prachtHtml); 
    } else {
        attributesContainer.append(prachtHtml);
        attributesContainer.append(funkeHtml);
    }

    // 6. Add Event Listeners (Only needed for View Mode / Rolling)
    // In Edit Mode, the <input name="..."> handles the data saving automatically via the System's form handler.
    
    if (!isEditMode) {
        html.find('.pracht-roll, .pracht-roll-label').on('click', (event) => {
            event.preventDefault();
            console.log(`${MODULE_ID} | Rolling Pracht`);
            app.actor.rollAttribute("resonance", { event: event });
        });

        html.find('.funke-roll, .funke-roll-label').on('click', (event) => {
            event.preventDefault();
            console.log(`${MODULE_ID} | Rolling Funke`);
            // Ensure 'submersion' is a valid attribute key for rolling in the system, 
            // otherwise this might default to a generic roll or fail.
            app.actor.rollAttribute("submersion", { event: event });
        });
    }
});