/* ==========================================================================
   ANIME EXPEDITIONS - TEAM BUILDER APPLICATION LOGIC (WITH EXPORT PREVIEW MODAL)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Global State
  let state = {
    activeMainTab: 'units', // 'units', 'std-equip', 'trait'
    activeRarity: 'Secret',
    searchQuery: '',
    activeTeamIdx: 0, // Track which team is currently displayed
    selectedSlot: { teamIdx: 0, slotIdx: 0, subSlotType: null, subSlotIdx: null },
    teams: [
      { id: 'team_1', name: 'ทีมที่ 1', slots: [null, null, null, null, null, null] } // 6 slots per team
    ]
  };

  let currentDragData = null;

  // DOM Elements
  const mainCatalogTabs = document.getElementById('main-catalog-tabs');
  const teamsContainer = document.getElementById('teams-container');
  const teamTabsContainer = document.getElementById('team-tabs');
  const unitsGrid = document.getElementById('units-grid');
  const stdEquipGrid = document.getElementById('std-equip-grid');
  const traitGrid = document.getElementById('trait-grid');
  const unitTabs = document.getElementById('unit-tabs');
  const unitSearchInput = document.getElementById('unit-search');
  const appTooltip = document.getElementById('app-tooltip');
  const toastContainer = document.getElementById('toast-container');

  // Modal Elements
  const exportModal = document.getElementById('export-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnModalCloseBottom = document.getElementById('btn-modal-close-bottom');
  const exportPreviewImg = document.getElementById('export-preview-img');
  const btnModalDownload = document.getElementById('btn-modal-download');

  // Header Buttons
  const btnAddTeamInline = document.getElementById('btn-add-team-inline');
  const btnClearAll = document.getElementById('btn-clear-all');
  const btnShare = document.getElementById('btn-share');
  const btnExport = document.getElementById('btn-export');

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  function init() {
    loadStateFromHash();
    renderUnitsCatalog();
    renderStdEquipCatalog();
    renderTraitCatalog();
    renderTeamTabs();
    renderTeams();
    setupEventListeners();
  }

  // ==========================================================================
  // RENDER TEAM TABS
  // ==========================================================================

  function renderTeamTabs() {
    teamTabsContainer.innerHTML = '';

    state.teams.forEach((team, teamIdx) => {
      const filledCount = team.slots.filter(s => s !== null).length;
      const isActive = teamIdx === state.activeTeamIdx;

      const tabBtn = document.createElement('button');
      tabBtn.className = `team-tab-btn ${isActive ? 'active' : ''}`;
      tabBtn.dataset.teamIdx = teamIdx;

      tabBtn.innerHTML = `
        <span class="team-tab-name">${escapeHtml(team.name)}</span>
        <span class="team-tab-count">${filledCount}/6</span>
        ${state.teams.length > 1 ? `<span class="team-tab-close" data-team-idx="${teamIdx}" title="ลบทีม">✕</span>` : ''}
      `;

      tabBtn.addEventListener('click', (e) => {
        if (e.target.closest('.team-tab-close')) {
          e.stopPropagation();
          const idx = parseInt(e.target.closest('.team-tab-close').dataset.teamIdx);
          deleteTeam(idx);
        } else {
          switchToTeam(teamIdx);
        }
      });

      teamTabsContainer.appendChild(tabBtn);
    });
  }

  function switchToTeam(teamIdx) {
    if (teamIdx < 0 || teamIdx >= state.teams.length) return;
    state.activeTeamIdx = teamIdx;
    state.selectedSlot = { teamIdx, slotIdx: 0, subSlotType: null, subSlotIdx: null };
    renderTeamTabs();
    renderTeams();
  }

  // ==========================================================================
  // RENDER CATALOGS
  // ==========================================================================

  function renderUnitsCatalog() {
    unitsGrid.innerHTML = '';

    const filtered = GAME_DATA.units.filter(unit => {
      const matchRarity = unit.rarity === state.activeRarity;
      const matchSearch = state.searchQuery === '' || 
        unit.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
        unit.num.toString().includes(state.searchQuery);
      return matchRarity && matchSearch;
    });

    if (filtered.length === 0) {
      unitsGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 20px; font-size: 13px;">ไม่พบตัวละคร</div>`;
      return;
    }

    filtered.forEach(unit => {
      const itemEl = document.createElement('div');
      itemEl.className = `catalog-item ${unit.rarity}`;
      itemEl.setAttribute('draggable', 'true');

      const key = `${unit.num}${unit.code}`;
      const boundEquips = GAME_DATA.unit_equip.filter(ue => ue.key === key);

      itemEl.innerHTML = `
        <img src="${unit.path}" alt="${unit.name}" loading="lazy">
        <span class="item-name">${unit.num}. ${unit.name}</span>
      `;

      itemEl.addEventListener('mouseenter', (e) => {
        showEnhancedTooltip(e, {
          type: 'unit',
          item: unit,
          boundEquips: boundEquips
        });
      });
      itemEl.addEventListener('mouseleave', hideTooltip);

      itemEl.addEventListener('dragstart', (e) => {
        currentDragData = { type: 'UNIT', data: unit };
        e.dataTransfer.setData('text/plain', JSON.stringify(currentDragData));
      });

      itemEl.addEventListener('click', () => {
        autoAddUnit(unit);
      });

      unitsGrid.appendChild(itemEl);
    });
  }

  function renderStdEquipCatalog() {
    stdEquipGrid.innerHTML = '';

    GAME_DATA.std_equip.forEach(equip => {
      const itemEl = document.createElement('div');
      itemEl.className = 'catalog-item';
      itemEl.setAttribute('draggable', 'true');

      itemEl.innerHTML = `
        <img src="${equip.path}" alt="${equip.name}" loading="lazy">
        <span class="item-name">${equip.name}</span>
      `;

      itemEl.addEventListener('mouseenter', (e) => {
        showEnhancedTooltip(e, {
          type: 'std-equip',
          item: equip
        });
      });
      itemEl.addEventListener('mouseleave', hideTooltip);

      itemEl.addEventListener('dragstart', (e) => {
        currentDragData = { type: 'STD_EQUIP', data: equip };
        e.dataTransfer.setData('text/plain', JSON.stringify(currentDragData));
      });

      itemEl.addEventListener('click', () => {
        autoAddStdEquip(equip);
      });

      stdEquipGrid.appendChild(itemEl);
    });
  }

  function renderTraitCatalog() {
    traitGrid.innerHTML = '';

    GAME_DATA.traits.forEach(trait => {
      const itemEl = document.createElement('div');
      itemEl.className = 'catalog-item';
      itemEl.setAttribute('draggable', 'true');

      itemEl.innerHTML = `
        <img src="${trait.path}" alt="${trait.name}" loading="lazy">
        <span class="item-name">${trait.num}. ${trait.name}</span>
      `;

      itemEl.addEventListener('mouseenter', (e) => {
        showEnhancedTooltip(e, {
          type: 'trait',
          item: trait
        });
      });
      itemEl.addEventListener('mouseleave', hideTooltip);

      itemEl.addEventListener('dragstart', (e) => {
        currentDragData = { type: 'TRAIT', data: trait };
        e.dataTransfer.setData('text/plain', JSON.stringify(currentDragData));
      });

      itemEl.addEventListener('click', () => {
        autoAddTrait(trait);
      });

      traitGrid.appendChild(itemEl);
    });
  }

  // ==========================================================================
  // RENDER TEAMS (6 SLOTS PER TEAM)
  // ==========================================================================

  function renderTeams() {
    teamsContainer.innerHTML = '';

    state.teams.forEach((team, teamIdx) => {
      const filledCount = team.slots.filter(s => s !== null).length;
      const isActiveTeam = teamIdx === state.activeTeamIdx;

      const teamCard = document.createElement('div');
      teamCard.className = `team-card ${isActiveTeam ? 'active-team' : ''}`;
      teamCard.dataset.teamIdx = teamIdx;

      const headerEl = document.createElement('div');
      headerEl.className = 'team-card-header';
      headerEl.innerHTML = `
        <div class="team-title-group">
          <input type="text" class="team-name" value="${escapeHtml(team.name)}" data-team-idx="${teamIdx}">
          <span class="unit-count-badge">${filledCount} / 6 ตัวละคร</span>
        </div>
        <div class="team-actions">
          <button class="btn btn-sm btn-secondary btn-clear-team" data-team-idx="${teamIdx}">เคลียร์ทีมนี้</button>
        </div>
      `;

      const slotsGrid = document.createElement('div');
      slotsGrid.className = 'team-slots-grid';

      for (let slotIdx = 0; slotIdx < 6; slotIdx++) {
        const slotData = team.slots[slotIdx];
        const slotEl = createUnitSlotElement(teamIdx, slotIdx, slotData);
        slotsGrid.appendChild(slotEl);
      }

      teamCard.appendChild(headerEl);
      teamCard.appendChild(slotsGrid);
      teamsContainer.appendChild(teamCard);
    });

    saveStateToHash();
  }

  function createUnitSlotElement(teamIdx, slotIdx, slotData) {
    const slotEl = document.createElement('div');
    slotEl.dataset.teamIdx = teamIdx;
    slotEl.dataset.slotIdx = slotIdx;

    const isSelected = state.selectedSlot && state.selectedSlot.teamIdx === teamIdx && state.selectedSlot.slotIdx === slotIdx;

    if (!slotData) {
      slotEl.className = `unit-slot empty ${isSelected ? 'selected-slot' : ''}`;
      slotEl.innerHTML = `
        <div class="slot-placeholder">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>ช่องที่ ${slotIdx + 1}</span>
        </div>
      `;

      slotEl.addEventListener('click', () => {
        state.selectedSlot = { teamIdx, slotIdx, subSlotType: null, subSlotIdx: null };
        renderTeams();
      });

      setupSlotDropTarget(slotEl, teamIdx, slotIdx);
      return slotEl;
    }

    const { unit, unitEquip, stdEquip, trait } = slotData;
    slotEl.className = `unit-slot filled rarity-${unit.rarity} ${isSelected ? 'selected-slot' : ''}`;
    slotEl.setAttribute('draggable', 'true');

    slotEl.addEventListener('click', (e) => {
      if (!e.target.closest('.unit-remove-btn') && !e.target.closest('.btn-move') && !e.target.closest('.trait-slot-box') && !e.target.closest('.std-equip-slot')) {
        state.selectedSlot = { teamIdx, slotIdx, subSlotType: null, subSlotIdx: null };
        renderTeams();
      }
    });

    slotEl.addEventListener('dragstart', (e) => {
      if (e.target.closest('.unit-remove-btn') || e.target.closest('.btn-move') || e.target.closest('.trait-slot-box') || e.target.closest('.equip-slot-box')) {
        e.preventDefault();
        return;
      }
      currentDragData = { type: 'MOVE_UNIT', sourceTeam: teamIdx, sourceSlot: slotIdx, data: unit };
      e.dataTransfer.setData('text/plain', JSON.stringify(currentDragData));
    });

    const canEquipStd = ['Secret', 'Exclusive', 'Mythic'].includes(unit.rarity);

    slotEl.innerHTML = `
      <div class="card-top-bar">
        <button class="unit-remove-btn" title="เอาออกเฉพาะตัว" data-team-idx="${teamIdx}" data-slot-idx="${slotIdx}">✕</button>
        <div class="unit-move-controls">
          ${slotIdx > 0 ? `<button class="btn-move btn-move-left" data-team-idx="${teamIdx}" data-slot-idx="${slotIdx}" title="เลื่อนซ้าย">◀</button>` : ''}
          ${slotIdx < 5 ? `<button class="btn-move btn-move-right" data-team-idx="${teamIdx}" data-slot-idx="${slotIdx}" title="เลื่อนขวา">▶</button>` : ''}
        </div>
      </div>

      <div class="card-main-content">
        <div class="unit-left-col">
          <div class="unit-portrait-wrapper">
            <img src="${unit.path}" alt="${unit.name}" class="unit-portrait-img">
            <div class="trait-slot-box ${trait ? '' : 'empty'} ${isSelected && state.selectedSlot.subSlotType === 'trait' ? 'selected-sub-slot' : ''}" data-team-idx="${teamIdx}" data-slot-idx="${slotIdx}" title="${trait ? 'ดับเบิ้ลคลิกเพื่อถอด Trait: ' + trait.name : 'คลิกเพื่อเลือกช่อง Trait นี้'}">
              ${trait ? `<img src="${trait.path}" alt="${trait.name}">` : ''}
            </div>
          </div>
          <div class="unit-name-label" title="${unit.name}">${unit.name}</div>
        </div>

        <div class="equip-column">
          <div class="equip-slot-box unit-equip-slot ${unitEquip && unitEquip.length > 0 ? '' : 'none-bound'}" 
               title="${unitEquip && unitEquip.length > 0 ? 'ไอเทมประจำตัว: ' + unitEquip.map(e=>e.name).join(', ') : 'ไม่มีไอเทมประจำตัว'}">
            ${unitEquip && unitEquip.length > 0 ? `<img src="${unitEquip[0].path}" alt="${unitEquip[0].name}">` : ''}
          </div>

          <div class="equip-slot-box std-equip-slot ${!canEquipStd ? 'disabled' : (stdEquip[0] ? '' : 'empty')} ${isSelected && state.selectedSlot.subSlotType === 'stdEquip' && state.selectedSlot.subSlotIdx === 0 ? 'selected-sub-slot' : ''}" 
               data-team-idx="${teamIdx}" data-slot-idx="${slotIdx}" data-equip-idx="0"
               title="${!canEquipStd ? 'ใส่ได้เฉพาะระดับ Secret/Exclusive/Mythic' : (stdEquip[0] ? 'ดับเบิ้ลคลิกเพื่อถอด: ' + stdEquip[0].name : 'คลิกเพื่อเลือกช่องไอเทมที่ 1')}">
            ${stdEquip[0] ? `<img src="${stdEquip[0].path}" alt="${stdEquip[0].name}">` : ''}
          </div>

          <div class="equip-slot-box std-equip-slot ${!canEquipStd ? 'disabled' : (stdEquip[1] ? '' : 'empty')} ${isSelected && state.selectedSlot.subSlotType === 'stdEquip' && state.selectedSlot.subSlotIdx === 1 ? 'selected-sub-slot' : ''}" 
               data-team-idx="${teamIdx}" data-slot-idx="${slotIdx}" data-equip-idx="1"
               title="${!canEquipStd ? 'ใส่ได้เฉพาะระดับ Secret/Exclusive/Mythic' : (stdEquip[1] ? 'ดับเบิ้ลคลิกเพื่อถอด: ' + stdEquip[1].name : 'คลิกเพื่อเลือกช่องไอเทมที่ 2')}">
            ${stdEquip[1] ? `<img src="${stdEquip[1].path}" alt="${stdEquip[1].name}">` : ''}
          </div>
        </div>
      </div>
    `;

    setupSlotDropTarget(slotEl, teamIdx, slotIdx);

    // Add enhanced tooltip for unit portrait
    const portraitWrapper = slotEl.querySelector('.unit-portrait-wrapper');
    if (portraitWrapper) {
      portraitWrapper.addEventListener('mouseenter', (e) => {
        const key = `${unit.num}${unit.code}`;
        const boundEquips = GAME_DATA.unit_equip.filter(ue => ue.key === key);
        showEnhancedTooltip(e, {
          type: 'unit-in-team',
          item: unit,
          boundEquips: boundEquips
        });
      });
      portraitWrapper.addEventListener('mouseleave', hideTooltip);
    }

    // Add tooltips for unit equipment (bound equipment)
    const unitEquipBox = slotEl.querySelector('.unit-equip-slot');
    if (unitEquipBox && unitEquip && unitEquip.length > 0) {
      unitEquipBox.addEventListener('mouseenter', (e) => {
        showEnhancedTooltip(e, {
          type: 'unit-equip',
          item: unitEquip[0]
        });
      });
      unitEquipBox.addEventListener('mouseleave', hideTooltip);
    }

    // Add tooltips and click for trait with image preview
    const traitBox = slotEl.querySelector('.trait-slot-box');
    if (traitBox) {
      traitBox.addEventListener('click', (e) => {
        e.stopPropagation();
        state.selectedSlot = { teamIdx, slotIdx, subSlotType: 'trait', subSlotIdx: null };
        renderTeams();
      });
      if (trait) {
        traitBox.addEventListener('mouseenter', (e) => {
          showEnhancedTooltip(e, {
            type: 'trait',
            item: trait
          });
        });
        traitBox.addEventListener('mouseleave', hideTooltip);

        traitBox.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          removeTrait(teamIdx, slotIdx);
        });
      }
    }

    // Add tooltips and click for standard equipment with image preview
    const stdBoxes = slotEl.querySelectorAll('.std-equip-slot');
    stdBoxes.forEach(box => {
      const equipIdx = parseInt(box.dataset.equipIdx);
      if (!box.classList.contains('disabled')) {
        box.addEventListener('click', (e) => {
          e.stopPropagation();
          state.selectedSlot = { teamIdx, slotIdx, subSlotType: 'stdEquip', subSlotIdx: equipIdx };
          renderTeams();
        });
      }
      if (stdEquip[equipIdx]) {
        box.addEventListener('mouseenter', (e) => {
          showEnhancedTooltip(e, {
            type: 'std-equip',
            item: stdEquip[equipIdx]
          });
        });
        box.addEventListener('mouseleave', hideTooltip);

        box.addEventListener('dblclick', (e) => {
          e.stopPropagation();
          removeStdEquip(teamIdx, slotIdx, equipIdx);
        });
      }
    });

    return slotEl;
  }

  // ==========================================================================
  // DISCREET, TARGETED DRAG AND DROP HIGHLIGHTING
  // ==========================================================================

  function setupSlotDropTarget(slotEl, teamIdx, slotIdx) {
    slotEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!currentDragData) return;

      clearDragOverClasses(slotEl);

      const dragType = currentDragData.type;

      if (dragType === 'UNIT' || dragType === 'MOVE_UNIT') {
        slotEl.classList.add('drag-over-unit');
      } else if (dragType === 'TRAIT') {
        const traitBox = slotEl.querySelector('.trait-slot-box');
        if (traitBox) {
          traitBox.classList.add('drag-over-trait');
        } else {
          slotEl.classList.add('drag-over-unit');
        }
      } else if (dragType === 'STD_EQUIP') {
        const targetBox = e.target.closest('.std-equip-slot');
        if (targetBox && !targetBox.classList.contains('disabled')) {
          targetBox.classList.add('drag-over-equip');
        } else {
          const emptySlot = slotEl.querySelector('.std-equip-slot.empty:not(.disabled)') || slotEl.querySelector('.std-equip-slot:not(.disabled)');
          if (emptySlot) {
            emptySlot.classList.add('drag-over-equip');
          }
        }
      }
    });

    slotEl.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearDragOverClasses(slotEl);
    });

    slotEl.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearDragOverClasses(slotEl);

      if (!currentDragData) return;

      const { type, data, sourceTeam, sourceSlot } = currentDragData;

      if (type === 'UNIT') {
        placeUnit(teamIdx, slotIdx, data);
      } else if (type === 'MOVE_UNIT') {
        moveUnitBetweenSlots(sourceTeam, sourceSlot, teamIdx, slotIdx);
      } else if (type === 'TRAIT') {
        placeTrait(teamIdx, slotIdx, data);
      } else if (type === 'STD_EQUIP') {
        const targetBox = e.target.closest('.std-equip-slot');
        let equipIdx = 0;
        if (targetBox && targetBox.dataset.equipIdx !== undefined) {
          equipIdx = parseInt(targetBox.dataset.equipIdx);
        } else {
          const unitSlot = state.teams[teamIdx].slots[slotIdx];
          if (unitSlot && unitSlot.stdEquip[0] && !unitSlot.stdEquip[1]) {
            equipIdx = 1;
          }
        }
        placeStdEquip(teamIdx, slotIdx, data, equipIdx);
      }

      currentDragData = null;
    });
  }

  function clearDragOverClasses(container) {
    container.classList.remove('drag-over-unit');
    const children = container.querySelectorAll('.drag-over-unit, .drag-over-trait, .drag-over-equip');
    children.forEach(c => {
      c.classList.remove('drag-over-unit');
      c.classList.remove('drag-over-trait');
      c.classList.remove('drag-over-equip');
    });
  }

  // ==========================================================================
  // CLICK-TO-EQUIP HELPERS
  // ==========================================================================

  function autoAddUnit(unitData) {
    let targetTeamIdx = state.activeTeamIdx;

    const dup = state.teams[targetTeamIdx].slots.find(s => s && s.unit.id === unitData.id);
    if (dup) {
      showToast(`ตัวละคร ${unitData.name} มีอยู่ในทีมนี้แล้ว!`, 'warning');
      return;
    }

    let targetSlotIdx = state.teams[targetTeamIdx].slots.findIndex(s => s === null);
    if (targetSlotIdx === -1) {
      for (let t = 0; t < state.teams.length; t++) {
        const dupOther = state.teams[t].slots.find(s => s && s.unit.id === unitData.id);
        if (dupOther) continue;

        const emptyIdx = state.teams[t].slots.findIndex(s => s === null);
        if (emptyIdx !== -1) {
          targetTeamIdx = t;
          targetSlotIdx = emptyIdx;
          break;
        }
      }
    }

    if (targetSlotIdx === -1) {
      showToast('ทีมเต็มแล้ว! กรุณาสร้างทีมใหม่หรือเลือกช่องที่ต้องการแทนที่', 'warning');
      return;
    }

    if (targetTeamIdx !== state.activeTeamIdx) {
      switchToTeam(targetTeamIdx);
    }

    placeUnit(targetTeamIdx, targetSlotIdx, unitData);
  }

  function autoAddStdEquip(equipData) {
    const { teamIdx, slotIdx, subSlotType, subSlotIdx } = state.selectedSlot || { teamIdx: state.activeTeamIdx, slotIdx: 0, subSlotType: null, subSlotIdx: null };
    const unitSlot = state.teams[teamIdx].slots[slotIdx];

    if (unitSlot && ['Secret', 'Exclusive', 'Mythic'].includes(unitSlot.unit.rarity)) {
      if (subSlotType === 'stdEquip' && subSlotIdx !== null) {
        placeStdEquip(teamIdx, slotIdx, equipData, subSlotIdx);
      } else {
        if (!unitSlot.stdEquip[0]) {
          placeStdEquip(teamIdx, slotIdx, equipData, 0);
        } else if (!unitSlot.stdEquip[1]) {
          placeStdEquip(teamIdx, slotIdx, equipData, 1);
        } else {
          showToast('ช่องสวมใส่เต็มแล้ว! กรุณาคลิกเลือกช่องที่ต้องการสวมทับ', 'warning');
        }
      }
      return;
    }

    for (let s = 0; s < 6; s++) {
      const slot = state.teams[teamIdx].slots[s];
      if (slot && ['Secret', 'Exclusive', 'Mythic'].includes(slot.unit.rarity)) {
        if (!slot.stdEquip[0]) {
          state.selectedSlot = { teamIdx, slotIdx: s, subSlotType: 'stdEquip', subSlotIdx: 0 };
          placeStdEquip(teamIdx, s, equipData, 0);
          return;
        } else if (!slot.stdEquip[1]) {
          state.selectedSlot = { teamIdx, slotIdx: s, subSlotType: 'stdEquip', subSlotIdx: 1 };
          placeStdEquip(teamIdx, s, equipData, 1);
          return;
        }
      }
    }

    showToast('ไม่มีตัวละคร หรือทุกช่องเต็มแล้ว! กรุณาเลือกช่องที่ต้องการสวมทับ', 'warning');
  }

  function autoAddTrait(traitData) {
    const { teamIdx, slotIdx } = state.selectedSlot || { teamIdx: state.activeTeamIdx, slotIdx: 0, subSlotType: null, subSlotIdx: null };
    const unitSlot = state.teams[teamIdx].slots[slotIdx];

    if (unitSlot) {
      placeTrait(teamIdx, slotIdx, traitData);
      return;
    }

    for (let s = 0; s < 6; s++) {
      const slot = state.teams[teamIdx].slots[s];
      if (slot && !slot.trait) {
        state.selectedSlot = { teamIdx, slotIdx: s };
        placeTrait(teamIdx, s, traitData);
        return;
      }
    }

    showToast('กรุณาคลิกเลือกตัวละครที่ต้องการใส่ Trait!', 'warning');
  }

  // ==========================================================================
  // TEAM MUTATION ACTIONS
  // ==========================================================================

  function placeUnit(teamIdx, slotIdx, unitData) {
    const team = state.teams[teamIdx];

    const duplicateIndex = team.slots.findIndex((s, idx) => s && s.unit.id === unitData.id && idx !== slotIdx);
    if (duplicateIndex !== -1) {
      showToast(`ตัวละคร ${unitData.name} มีอยู่ในทีมนี้แล้ว!`, 'warning');
      return;
    }

    const key = `${unitData.num}${unitData.code}`;
    const boundEquips = GAME_DATA.unit_equip.filter(ue => ue.key === key);

    team.slots[slotIdx] = {
      unit: unitData,
      unitEquip: boundEquips,
      stdEquip: [null, null],
      trait: null
    };

    state.selectedSlot = { teamIdx, slotIdx };
    showToast(`เพิ่ม ${unitData.name} เข้าทีมสำเร็จ!`, 'success');
    renderTeams();
  }

  function moveUnitBetweenSlots(srcTeamIdx, srcSlotIdx, targetTeamIdx, targetSlotIdx) {
    if (srcTeamIdx === targetTeamIdx && srcSlotIdx === targetSlotIdx) return;

    const srcUnitObj = state.teams[srcTeamIdx].slots[srcSlotIdx];
    const targetUnitObj = state.teams[targetTeamIdx].slots[targetSlotIdx];

    if (srcTeamIdx !== targetTeamIdx && srcUnitObj) {
      const dup = state.teams[targetTeamIdx].slots.find((s, i) => i !== targetSlotIdx && s && s.unit.id === srcUnitObj.unit.id);
      if (dup) {
        showToast(`ไม่สามารถย้ายได้ เนื่องจากมี ${srcUnitObj.unit.name} ในทีมเป้าหมายแล้ว!`, 'warning');
        return;
      }
    }

    state.teams[srcTeamIdx].slots[srcSlotIdx] = targetUnitObj;
    state.teams[targetTeamIdx].slots[targetSlotIdx] = srcUnitObj;
    state.selectedSlot = { teamIdx: targetTeamIdx, slotIdx: targetSlotIdx };

    renderTeams();
  }

  function placeStdEquip(teamIdx, slotIdx, equipData, targetEquipIdx = 0) {
    const slotData = state.teams[teamIdx].slots[slotIdx];
    if (!slotData) {
      showToast('กรุณาเลือกหรือลากใส่ช่องที่มีตัวละครก่อน!', 'warning');
      return;
    }

    if (!['Secret', 'Exclusive', 'Mythic'].includes(slotData.unit.rarity)) {
      showToast(`ตัวละครระดับ ${slotData.unit.rarity} ไม่สามารถใส่ Standard Equipment ได้!`, 'warning');
      return;
    }

    const existingIdx = slotData.stdEquip.findIndex((e, idx) => e && e.id === equipData.id && idx !== targetEquipIdx);
    if (existingIdx !== -1) {
      showToast(`ไม่สามารถใส่ ${equipData.name} ซ้ำชิ้นกันในตัวละครเดียวกันได้!`, 'warning');
      return;
    }

    slotData.stdEquip[targetEquipIdx] = equipData;
    showToast(`สวมใส่ ${equipData.name} สำเร็จ!`, 'success');
    renderTeams();
  }

  function placeTrait(teamIdx, slotIdx, traitData) {
    const slotData = state.teams[teamIdx].slots[slotIdx];
    if (!slotData) {
      showToast('กรุณาเลือกหรือลากใส่ช่องที่มีตัวละครก่อน!', 'warning');
      return;
    }

    slotData.trait = traitData;
    showToast(`สวมใส่ Trait: ${traitData.name} สำเร็จ!`, 'success');
    renderTeams();
  }

  function removeStdEquip(teamIdx, slotIdx, equipIdx) {
    const slotData = state.teams[teamIdx].slots[slotIdx];
    if (slotData && slotData.stdEquip[equipIdx]) {
      const name = slotData.stdEquip[equipIdx].name;
      slotData.stdEquip[equipIdx] = null;
      showToast(`ถอด ${name} ออกแล้ว`, 'info');
      renderTeams();
    }
  }

  function removeTrait(teamIdx, slotIdx) {
    const slotData = state.teams[teamIdx].slots[slotIdx];
    if (slotData && slotData.trait) {
      const name = slotData.trait.name;
      slotData.trait = null;
      showToast(`ถอด Trait: ${name} ออกแล้ว`, 'info');
      renderTeams();
    }
  }

  function removeUnit(teamIdx, slotIdx) {
    const slotData = state.teams[teamIdx].slots[slotIdx];
    if (slotData) {
      showToast(`เอาตัวละคร ${slotData.unit.name} ออกจากทีมแล้ว`, 'info');
      state.teams[teamIdx].slots[slotIdx] = null;
      renderTeamTabs();
      renderTeams();
    }
  }

  function clearTeam(teamIdx) {
    state.teams[teamIdx].slots = [null, null, null, null, null, null];
    showToast(`เคลียร์ทีมที่ ${teamIdx + 1} เรียบร้อยแล้ว`, 'info');
    renderTeamTabs();
    renderTeams();
  }

  function clearAllTeams() {
    if (confirm('คุณต้องการเคลียร์ตัวละครและของสวมใส่ทุกทีมทิ้งใช่หรือไม่?')) {
      state.teams.forEach(t => t.slots = [null, null, null, null, null, null]);
      showToast('เคลียร์ทุกทีมทิ้งเรียบร้อยแล้ว', 'info');
      renderTeamTabs();
      renderTeams();
    }
  }

  function addNewTeam() {
    const newIdx = state.teams.length + 1;
    state.teams.push({
      id: `team_${Date.now()}`,
      name: `ทีมที่ ${newIdx}`,
      slots: [null, null, null, null, null, null]
    });
    state.activeTeamIdx = state.teams.length - 1;
    state.selectedSlot = { teamIdx: state.activeTeamIdx, slotIdx: 0, subSlotType: null, subSlotIdx: null };
    showToast(`เพิ่มทีมที่ ${newIdx} เรียบร้อยแล้ว`, 'success');
    renderTeamTabs();
    renderTeams();
  }

  function deleteTeam(teamIdx) {
    if (state.teams.length <= 1) {
      showToast('ต้องมีอย่างน้อย 1 ทีม!', 'warning');
      return;
    }
    
    if (!confirm(`คุณต้องการลบ "${state.teams[teamIdx].name}" ใช่หรือไม่?`)) {
      return;
    }

    state.teams.splice(teamIdx, 1);
    
    // Adjust activeTeamIdx if needed
    if (state.activeTeamIdx >= state.teams.length) {
      state.activeTeamIdx = state.teams.length - 1;
    }
    
    state.selectedSlot = { teamIdx: state.activeTeamIdx, slotIdx: 0, subSlotType: null, subSlotIdx: null };
    showToast('ลบทีมเรียบร้อยแล้ว', 'info');
    renderTeamTabs();
    renderTeams();
  }

  // ==========================================================================
  // EVENT LISTENERS SETUP
  // ==========================================================================

  function setupEventListeners() {
    mainCatalogTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.main-tab-btn');
      if (!btn) return;

      const targetTab = btn.dataset.tab;
      state.activeMainTab = targetTab;

      mainCatalogTabs.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.catalog-panel').forEach(p => p.classList.remove('active'));
      if (targetTab === 'units') document.getElementById('panel-units').classList.add('active');
      if (targetTab === 'std-equip') document.getElementById('panel-std-equip').classList.add('active');
      if (targetTab === 'trait') document.getElementById('panel-trait').classList.add('active');
    });

    unitTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      unitTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeRarity = btn.dataset.rarity;
      renderUnitsCatalog();
    });

    unitSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim();
      renderUnitsCatalog();
    });

    btnAddTeamInline.addEventListener('click', addNewTeam);
    btnClearAll.addEventListener('click', clearAllTeams);
    btnShare.addEventListener('click', copyShareLink);
    btnExport.addEventListener('click', exportTeamImage);

    // Modal Close listeners
    btnCloseModal.addEventListener('click', closeModal);
    btnModalCloseBottom.addEventListener('click', closeModal);
    exportModal.addEventListener('click', (e) => {
      if (e.target === exportModal) closeModal();
    });

    // Zoom controls
    document.querySelectorAll('.btn-zoom').forEach(btn => {
      btn.addEventListener('click', () => {
        const zoom = btn.dataset.zoom;
        const img = exportPreviewImg;
        
        // Remove active class from all buttons
        document.querySelectorAll('.btn-zoom').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (zoom === 'fit') {
          img.style.maxWidth = '100%';
          img.style.width = 'auto';
        } else {
          const percentage = parseInt(zoom);
          img.style.maxWidth = 'none';
          img.style.width = `${percentage}%`;
        }
      });
    });

    teamsContainer.addEventListener('click', (e) => {
      const btnRemove = e.target.closest('.unit-remove-btn');
      if (btnRemove) {
        removeUnit(parseInt(btnRemove.dataset.teamIdx), parseInt(btnRemove.dataset.slotIdx));
        return;
      }

      const btnMoveLeft = e.target.closest('.btn-move-left');
      if (btnMoveLeft) {
        const tIdx = parseInt(btnMoveLeft.dataset.teamIdx);
        const sIdx = parseInt(btnMoveLeft.dataset.slotIdx);
        moveUnitBetweenSlots(tIdx, sIdx, tIdx, sIdx - 1);
        return;
      }

      const btnMoveRight = e.target.closest('.btn-move-right');
      if (btnMoveRight) {
        const tIdx = parseInt(btnMoveRight.dataset.teamIdx);
        const sIdx = parseInt(btnMoveRight.dataset.slotIdx);
        moveUnitBetweenSlots(tIdx, sIdx, tIdx, sIdx + 1);
        return;
      }

      const btnClear = e.target.closest('.btn-clear-team');
      if (btnClear) {
        clearTeam(parseInt(btnClear.dataset.teamIdx));
        return;
      }
    });

    teamsContainer.addEventListener('change', (e) => {
      if (e.target.classList.contains('team-name')) {
        const teamIdx = parseInt(e.target.dataset.teamIdx);
        state.teams[teamIdx].name = e.target.value;
        renderTeamTabs();
        saveStateToHash();
      }
    });
  }

  function closeModal() {
    exportModal.classList.add('hidden');
    // Reset zoom when closing
    const img = exportPreviewImg;
    img.style.maxWidth = '100%';
    img.style.width = 'auto';
    document.querySelectorAll('.btn-zoom').forEach(btn => btn.classList.remove('active'));
    document.querySelector('.btn-zoom[data-zoom="100"]').classList.add('active');
  }

  // ==========================================================================
  // STATE PERSISTENCE & SHARING
  // ==========================================================================

  function saveStateToHash() {
    try {
      const minimalData = state.teams.map(t => ({
        n: t.name,
        s: t.slots.map(s => {
          if (!s) return null;
          return {
            u: s.unit.id,
            e: s.stdEquip.map(e => e ? e.id : null),
            t: s.trait ? s.trait.id : null
          };
        })
      }));

      const jsonStr = JSON.stringify(minimalData);
      const b64 = btoa(encodeURIComponent(jsonStr));
      window.history.replaceState(null, '', `#teamData=${b64}`);
    } catch (err) {
      console.error('Error saving state to hash:', err);
    }
  }

  function loadStateFromHash() {
    try {
      const hash = window.location.hash;
      if (!hash.includes('teamData=')) return;

      const b64 = hash.split('teamData=')[1];
      if (!b64) return;

      const jsonStr = decodeURIComponent(atob(b64));
      const minimalData = JSON.parse(jsonStr);

      state.teams = minimalData.map((t, idx) => ({
        id: `team_${idx + 1}`,
        name: t.n || `ทีมที่ ${idx + 1}`,
        slots: t.s.map(s => {
          if (!s) return null;
          const unit = GAME_DATA.units.find(u => u.id === s.u);
          if (!unit) return null;

          const key = `${unit.num}${unit.code}`;
          const boundEquips = GAME_DATA.unit_equip.filter(ue => ue.key === key);
          const stdEquip = (s.e || []).map(eId => eId ? GAME_DATA.std_equip.find(e => e.id === eId) || null : null);
          const trait = s.t ? GAME_DATA.traits.find(tr => tr.id === s.t) || null : null;

          return {
            unit,
            unitEquip: boundEquips,
            stdEquip: [stdEquip[0] || null, stdEquip[1] || null],
            trait
          };
        })
      }));
    } catch (err) {
      console.error('Error loading state from hash:', err);
    }
  }

  function copyShareLink() {
    saveStateToHash();
    navigator.clipboard.writeText(window.location.href).then(() => {
      showToast('คัดลอกลิงก์แชร์ทีมเรียบร้อยแล้ว!', 'success');
    }).catch(() => {
      showToast('คัดลอกลิงก์ไม่สำเร็จ กรุณาก๊อปปี้ URL จากช่องแอดเดรสบาร์', 'warning');
    });
  }

  // ==========================================================================
  // EXPORT AS IMAGE (MODAL PREVIEW + DIRECT SAVE AS PNG)
  // ==========================================================================

  function exportTeamImage() {
    showToast('กำลังเตรียมรูปภาพทีม...', 'info');

    const canvas = document.getElementById('export-canvas');
    const ctx = canvas.getContext('2d');

    // Increase resolution for better quality
    const scale = 2; // 2x resolution for crisp output
    const totalTeams = state.teams.length;
    const cardWidth = 1600; // Increased from 1380
    const cardHeight = 320; // Increased from 270
    const padding = 32;
    const headerHeight = 80;

    canvas.width = (cardWidth + (padding * 2)) * scale;
    canvas.height = (headerHeight + (totalTeams * cardHeight) + (padding * 2)) * scale;

    // Scale context for high DPI
    ctx.scale(scale, scale);

    // Background
    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Kanit, sans-serif';
    ctx.fillText('ANIME EXPEDITIONS - TEAM BUILDER', padding, 45);

    const renderPromises = [];

    state.teams.forEach((team, teamIdx) => {
      const startY = headerHeight + (teamIdx * cardHeight);

      // Team card background
      ctx.fillStyle = '#121824';
      ctx.strokeStyle = '#21262d';
      ctx.lineWidth = 2;
      ctx.fillRect(padding, startY, cardWidth, cardHeight - 20);
      ctx.strokeRect(padding, startY, cardWidth, cardHeight - 20);

      // Team name
      ctx.fillStyle = '#4facfe';
      ctx.font = 'bold 20px Kanit, sans-serif';
      const teamNameText = team.name.length > 40 ? team.name.substring(0, 38) + '...' : team.name;
      ctx.fillText(teamNameText, padding + 24, startY + 36);

      // Filled slots count (moved to the right side)
      const filledCount = team.slots.filter(s => s !== null).length;
      ctx.fillStyle = '#8a99ad';
      ctx.font = '16px Kanit, sans-serif';
      const countText = `${filledCount} / 6 ตัวละคร`;
      const countWidth = ctx.measureText(countText).width;
      ctx.fillText(countText, cardWidth + padding - countWidth - 24, startY + 36);

      team.slots.forEach((slot, slotIdx) => {
        const slotX = padding + 24 + (slotIdx * 258); // Increased spacing
        const slotY = startY + 55;
        const slotW = 245; // Increased from 208
        const slotH = 235; // Increased from 190

        // Slot background
        ctx.fillStyle = '#182030';
        ctx.fillRect(slotX, slotY, slotW, slotH);
        ctx.strokeStyle = slot ? getRarityColor(slot.unit.rarity) : '#2b3548';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(slotX, slotY, slotW, slotH);

        if (slot) {
          const p = new Promise(resolve => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = slot.unit.path;
            img.onload = () => {
              // Unit portrait background
              ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
              ctx.fillRect(slotX + 12, slotY + 18, 150, 150);
              
              // Draw unit portrait (maintain aspect ratio)
              const imgAspect = img.width / img.height;
              let drawWidth = 140;
              let drawHeight = 140;
              
              if (imgAspect > 1) {
                // Width > Height
                drawHeight = drawWidth / imgAspect;
              } else {
                // Height > Width
                drawWidth = drawHeight * imgAspect;
              }
              
              const drawX = slotX + 17 + (140 - drawWidth) / 2;
              const drawY = slotY + 23 + (140 - drawHeight) / 2;
              
              ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);

              // Unit name
              ctx.fillStyle = '#f0f4f8';
              ctx.font = 'bold 13px Kanit, sans-serif';
              const unitNameText = slot.unit.name.length > 18 ? slot.unit.name.substring(0, 16) + '...' : slot.unit.name;
              const textWidth = ctx.measureText(unitNameText).width;
              ctx.fillText(unitNameText, slotX + 12 + (150 - textWidth) / 2, slotY + 185);

              // Trait slot
              if (slot.trait) {
                const tImg = new Image();
                tImg.crossOrigin = 'anonymous';
                tImg.src = slot.trait.path;
                tImg.onload = () => {
                  ctx.fillStyle = 'rgba(20, 25, 35, 0.95)';
                  ctx.strokeStyle = '#f39c12';
                  ctx.lineWidth = 2.5;
                  ctx.fillRect(slotX + 110, slotY + 10, 52, 52);
                  ctx.strokeRect(slotX + 110, slotY + 10, 52, 52);
                  ctx.drawImage(tImg, slotX + 116, slotY + 16, 40, 40);
                  loadEquipImages();
                };
                tImg.onerror = loadEquipImages;
              } else {
                loadEquipImages();
              }

              function loadEquipImages() {
                const eqPromises = [];
                const equipX = slotX + 175;

                // Unit Equipment
                if (slot.unitEquip && slot.unitEquip.length > 0) {
                  const ueP = new Promise(res => {
                    const ueImg = new Image();
                    ueImg.crossOrigin = 'anonymous';
                    ueImg.src = slot.unitEquip[0].path;
                    ueImg.onload = () => {
                      ctx.fillStyle = 'rgba(192, 57, 43, 0.15)';
                      ctx.strokeStyle = '#c0392b';
                      ctx.lineWidth = 2.5;
                      ctx.fillRect(equipX, slotY + 18, 56, 56);
                      ctx.strokeRect(equipX, slotY + 18, 56, 56);
                      ctx.drawImage(ueImg, equipX + 6, slotY + 24, 44, 44);
                      res();
                    };
                    ueImg.onerror = res;
                  });
                  eqPromises.push(ueP);
                } else {
                  ctx.fillStyle = 'rgba(15, 20, 30, 0.5)';
                  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                  ctx.lineWidth = 1.5;
                  ctx.fillRect(equipX, slotY + 18, 56, 56);
                  ctx.strokeRect(equipX, slotY + 18, 56, 56);
                }

                // Standard Equipment 1
                if (slot.stdEquip && slot.stdEquip[0]) {
                  const se1P = new Promise(res => {
                    const se1Img = new Image();
                    se1Img.crossOrigin = 'anonymous';
                    se1Img.src = slot.stdEquip[0].path;
                    se1Img.onload = () => {
                      ctx.fillStyle = 'rgba(15, 20, 30, 0.95)';
                      ctx.strokeStyle = '#2980b9';
                      ctx.lineWidth = 2.5;
                      ctx.fillRect(equipX, slotY + 82, 56, 56);
                      ctx.strokeRect(equipX, slotY + 82, 56, 56);
                      ctx.drawImage(se1Img, equipX + 6, slotY + 88, 44, 44);
                      res();
                    };
                    se1Img.onerror = res;
                  });
                  eqPromises.push(se1P);
                } else {
                  ctx.fillStyle = 'rgba(15, 20, 30, 0.5)';
                  ctx.strokeStyle = 'rgba(41, 128, 185, 0.4)';
                  ctx.lineWidth = 1.5;
                  ctx.fillRect(equipX, slotY + 82, 56, 56);
                  ctx.strokeRect(equipX, slotY + 82, 56, 56);
                }

                // Standard Equipment 2
                if (slot.stdEquip && slot.stdEquip[1]) {
                  const se2P = new Promise(res => {
                    const se2Img = new Image();
                    se2Img.crossOrigin = 'anonymous';
                    se2Img.src = slot.stdEquip[1].path;
                    se2Img.onload = () => {
                      ctx.fillStyle = 'rgba(15, 20, 30, 0.95)';
                      ctx.strokeStyle = '#2980b9';
                      ctx.lineWidth = 2.5;
                      ctx.fillRect(equipX, slotY + 146, 56, 56);
                      ctx.strokeRect(equipX, slotY + 146, 56, 56);
                      ctx.drawImage(se2Img, equipX + 6, slotY + 152, 44, 44);
                      res();
                    };
                    se2Img.onerror = res;
                  });
                  eqPromises.push(se2P);
                } else {
                  ctx.fillStyle = 'rgba(15, 20, 30, 0.5)';
                  ctx.strokeStyle = 'rgba(41, 128, 185, 0.4)';
                  ctx.lineWidth = 1.5;
                  ctx.fillRect(equipX, slotY + 146, 56, 56);
                  ctx.strokeRect(equipX, slotY + 146, 56, 56);
                }

                Promise.all(eqPromises).then(() => resolve());
              }
            };
            img.onerror = () => resolve();
          });
          renderPromises.push(p);
        } else {
          // Empty slot text
          ctx.fillStyle = '#4a5568';
          ctx.font = '14px Kanit, sans-serif';
          const emptyText = `ช่องที่ ${slotIdx + 1}`;
          const textWidth = ctx.measureText(emptyText).width;
          ctx.fillText(emptyText, slotX + (slotW - textWidth) / 2, slotY + slotH / 2);
        }
      });
    });

    Promise.all(renderPromises).then(() => {
      const dataUrl = canvas.toDataURL('image/png', 1.0); // Maximum quality
      exportPreviewImg.src = dataUrl;
      btnModalDownload.href = dataUrl;
      btnModalDownload.download = 'Anime_Expeditions_Teams.png';

      exportModal.classList.remove('hidden');

      showToast('เปิดพรีวิวรูปภาพเรียบร้อยแล้ว! คลิกปุ่มดาวน์โหลดเพื่อบันทึกไฟล์', 'success');
    });
  }

  function getRarityColor(rarity) {
    switch (rarity) {
      case 'Secret': return '#ff2a5f';
      case 'Exclusive': return '#00f2fe';
      case 'Mythic': return '#e056fd';
      case 'Legendary': return '#f1c40f';
      case 'Epic': return '#a55eea';
      case 'Rare': return '#4b7bec';
      default: return '#ffffff';
    }
  }

  // ==========================================================================
  // HELPER UTILITIES
  // ==========================================================================

  function showTooltip(e, contentHTML) {
    appTooltip.innerHTML = contentHTML;
    appTooltip.classList.remove('hidden');
    moveTooltip(e);
  }

  function showEnhancedTooltip(event, data) {
    const { type, item, boundEquips } = data;
    
    let tooltipHTML = '';

    // Image Preview Section
    tooltipHTML += `<div class="tooltip-image-preview">`;
    tooltipHTML += `<img src="${item.path}" alt="${item.name}">`;
    tooltipHTML += `</div>`;

    // Content Section
    tooltipHTML += `<div class="tooltip-content">`;

    // Title
    tooltipHTML += `<div class="tooltip-title">${item.name}</div>`;

    if (type === 'unit') {
      // Rarity Badge
      tooltipHTML += `<div class="tooltip-rarity ${item.rarity}">${item.rarity}</div>`;

      // Info Rows
      tooltipHTML += `<div class="tooltip-info-row">`;
      tooltipHTML += `<span class="tooltip-label">ID:</span>`;
      tooltipHTML += `<span class="tooltip-value">#${item.num}</span>`;
      tooltipHTML += `</div>`;

      // Bound Equipment
      if (boundEquips && boundEquips.length > 0) {
        tooltipHTML += `<div class="tooltip-info-row">`;
        tooltipHTML += `<span class="tooltip-label">ไอเทมประจำตัว:</span>`;
        tooltipHTML += `<div class="tooltip-equip-list">`;
        boundEquips.forEach(equip => {
          tooltipHTML += `<span class="tooltip-equip-item">`;
          tooltipHTML += `<img src="${equip.path}" alt="${equip.name}">`;
          tooltipHTML += `${equip.name}`;
          tooltipHTML += `</span>`;
        });
        tooltipHTML += `</div>`;
        tooltipHTML += `</div>`;
      } else {
        tooltipHTML += `<div class="tooltip-info-row">`;
        tooltipHTML += `<span class="tooltip-label">ไอเทมประจำตัว:</span>`;
        tooltipHTML += `<span class="tooltip-value" style="color: var(--text-muted);">ไม่มี</span>`;
        tooltipHTML += `</div>`;
      }

      tooltipHTML += `<div class="tooltip-hint">คลิกหรือลากเพื่อเพิ่มเข้าทีม</div>`;

    } else if (type === 'std-equip') {
      tooltipHTML += `<div class="tooltip-info-row">`;
      tooltipHTML += `<span class="tooltip-label">ประเภท:</span>`;
      tooltipHTML += `<span class="tooltip-value">Standard Equipment</span>`;
      tooltipHTML += `</div>`;

      tooltipHTML += `<div class="tooltip-info-row">`;
      tooltipHTML += `<span class="tooltip-label">ใช้ได้กับ:</span>`;
      tooltipHTML += `<span class="tooltip-value">Secret, Exclusive, Mythic</span>`;
      tooltipHTML += `</div>`;

      tooltipHTML += `<div class="tooltip-hint">คลิกหรือลากไปวางที่ตัวละคร</div>`;

    } else if (type === 'unit-equip') {
      // For unit-specific equipment
      tooltipHTML += `<div class="tooltip-info-row">`;
      tooltipHTML += `<span class="tooltip-label">ประเภท:</span>`;
      tooltipHTML += `<span class="tooltip-value">Unit Equipment (ไอเทมประจำตัว)</span>`;
      tooltipHTML += `</div>`;

      tooltipHTML += `<div class="tooltip-info-row">`;
      tooltipHTML += `<span class="tooltip-label">สถานะ:</span>`;
      tooltipHTML += `<span class="tooltip-value" style="color: #ff6b6b;">ใช้ได้เฉพาะตัวละครเท่านั้น</span>`;
      tooltipHTML += `</div>`;

      tooltipHTML += `<div class="tooltip-hint">ไอเทมนี้ติดมากับตัวละครโดยอัตโนมัติ</div>`;

    } else if (type === 'trait') {
      tooltipHTML += `<div class="tooltip-info-row">`;
      tooltipHTML += `<span class="tooltip-label">ประเภท:</span>`;
      tooltipHTML += `<span class="tooltip-value">Trait (นิสัย)</span>`;
      tooltipHTML += `</div>`;

      tooltipHTML += `<div class="tooltip-info-row">`;
      tooltipHTML += `<span class="tooltip-label">ID:</span>`;
      tooltipHTML += `<span class="tooltip-value">#${item.num}</span>`;
      tooltipHTML += `</div>`;

      tooltipHTML += `<div class="tooltip-hint">คลิกหรือลากไปวางที่ตัวละคร</div>`;
    } else if (type === 'unit-in-team') {
      // For units already placed in team
      tooltipHTML += `<div class="tooltip-rarity ${item.rarity}">${item.rarity}</div>`;

      tooltipHTML += `<div class="tooltip-info-row">`;
      tooltipHTML += `<span class="tooltip-label">ID:</span>`;
      tooltipHTML += `<span class="tooltip-value">#${item.num}</span>`;
      tooltipHTML += `</div>`;

      if (boundEquips && boundEquips.length > 0) {
        tooltipHTML += `<div class="tooltip-info-row">`;
        tooltipHTML += `<span class="tooltip-label">ไอเทมประจำตัว:</span>`;
        tooltipHTML += `<div class="tooltip-equip-list">`;
        boundEquips.forEach(equip => {
          tooltipHTML += `<span class="tooltip-equip-item">`;
          tooltipHTML += `<img src="${equip.path}" alt="${equip.name}">`;
          tooltipHTML += `${equip.name}`;
          tooltipHTML += `</span>`;
        });
        tooltipHTML += `</div>`;
        tooltipHTML += `</div>`;
      }

      tooltipHTML += `<div class="tooltip-hint">ลากเพื่อย้าย / คลิกปุ่ม ✕ เพื่อลบ</div>`;
    }

    tooltipHTML += `</div>`; // Close tooltip-content

    appTooltip.innerHTML = tooltipHTML;
    appTooltip.classList.remove('hidden');
    moveTooltip(event);
  }

  function moveTooltip(e) {
    const tooltipRect = appTooltip.getBoundingClientRect();
    const padding = 15;
    
    let x = e.clientX + padding;
    let y = e.clientY + padding;

    // Prevent tooltip from going off-screen right
    if (x + tooltipRect.width > window.innerWidth - padding) {
      x = e.clientX - tooltipRect.width - padding;
    }

    // Prevent tooltip from going off-screen bottom
    if (y + tooltipRect.height > window.innerHeight - padding) {
      y = e.clientY - tooltipRect.height - padding;
    }

    // Prevent tooltip from going off-screen left
    if (x < padding) {
      x = padding;
    }

    // Prevent tooltip from going off-screen top
    if (y < padding) {
      y = padding;
    }

    appTooltip.style.left = `${x}px`;
    appTooltip.style.top = `${y}px`;
  }

  function hideTooltip() {
    appTooltip.classList.add('hidden');
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Track mouse movement for smooth tooltip positioning
  document.addEventListener('mousemove', (e) => {
    if (!appTooltip.classList.contains('hidden')) {
      moveTooltip(e);
    }
  });

  init();
});
