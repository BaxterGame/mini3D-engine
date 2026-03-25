// mini-engine v0.2i — inventory UI pass 2
// Objectif : version plus compacte, alignée à gauche, sans angles ronds,
// avec navigation verticale plus stable et moins de bruit textuel.

const INVENTORY_CATEGORIES = [
  {
    id: 'wall',
    label: 'Wall',
    modeLabel: 'WALL',
    icon: '▥',
    accent: '#9f56ff',
    swatch: 'linear-gradient(180deg, #8f67ff 0%, #6244ea 100%)',
    description: 'Construction de blocs et variantes de structure.',
    items: [
      { id: 'brick-dense', label: 'BR H2', meta: 'Solidité haute', swatch: 'linear-gradient(180deg, #2ee1b9 0%, #0da486 100%)' },
      { id: 'brick-light', label: 'BX H1', meta: 'Version légère / rapide', swatch: 'linear-gradient(180deg, #ff8a94 0%, #d93b49 100%)' },
      { id: 'brick-wide', label: 'BZR Dense', meta: 'Solidité faible', swatch: 'linear-gradient(180deg, #e4ff2a 0%, #a7d800 100%)' },
      { id: 'brick-mini', label: 'Node Grid', meta: 'Plots + links', swatch: 'linear-gradient(180deg, #ff67a4 0%, #d93f7f 100%)' },
      { id: 'brick-standard', label: 'Rebar Frame', meta: 'Armature / frame', swatch: 'linear-gradient(180deg, #d38aff 0%, #7a0fd6 100%)' },
      { id: 'brick-tall', label: 'Ribbon Wall', meta: 'Flat signal band', swatch: 'linear-gradient(180deg, #baf6ff 0%, #36b8ff 100%)' },
      { id: 'brick-capsule', label: 'Capsule Wall', meta: 'Capsules overlapped', swatch: 'linear-gradient(180deg, #eaabff 0%, #ad03fc 100%)' },
    ],
  },
  {
    id: 'aqua',
    label: 'Aqua',
    modeLabel: 'AQUA',
    icon: '◉',
    accent: '#4fc7ff',
    swatch: 'linear-gradient(180deg, #5fe5ff 0%, #2f92ff 100%)',
    description: 'Famille liquide et matières fluides.',
    items: [
      { id: 'aqua-water', label: 'Water', meta: 'Flux neutre', swatch: 'linear-gradient(180deg, #4be9ff 0%, #1780ff 100%)' },
      { id: 'aqua-lava', label: 'Lava', meta: 'Dégâts / chaleur', swatch: 'linear-gradient(180deg, #ff9c4a 0%, #ff4336 100%)' },
      { id: 'aqua-glue', label: 'Glue', meta: 'Frein / adhérence', swatch: 'linear-gradient(180deg, #dbff58 0%, #95d628 100%)' },
      { id: 'aqua-mist', label: 'Mist', meta: 'Placeholder FX', swatch: 'linear-gradient(180deg, #e8fbff 0%, #a3d9ff 100%)' },
    ],
  },
  {
    id: 'projectile',
    label: 'Projectile',
    modeLabel: 'PROJECTILE',
    icon: '➤',
    accent: '#ff6d73',
    swatch: 'linear-gradient(180deg, #ff8b66 0%, #ff4b5d 100%)',
    description: 'Famille offensive simple.',
    items: [
      { id: 'proj-light', label: 'PR Light', meta: 'Vitesse +', swatch: 'linear-gradient(180deg, #ffdf71 0%, #ff9f2e 100%)' },
      { id: 'proj-heavy', label: 'HX Heavy', meta: 'Impact +', swatch: 'linear-gradient(180deg, #ff8f78 0%, #ff4f5b 100%)' },
      { id: 'proj-wide', label: 'Wide 3×', meta: 'Hitbox +', swatch: 'linear-gradient(180deg, #f6b3ff 0%, #cb54ff 100%)' },
      { id: 'proj-shard', label: 'Shard', meta: 'Fragmentation', swatch: 'linear-gradient(180deg, #f2f4f8 0%, #a8b2c6 100%)' },
    ],
  },
  {
    id: 'vehicle',
    label: 'Vehicle',
    modeLabel: 'VEHICLE',
    icon: '▤',
    accent: '#64f3a8',
    swatch: 'linear-gradient(180deg, #7bff95 0%, #3cbf76 100%)',
    description: 'Famille mobilité et déplacement.',
    items: [
      { id: 'vehicle-car', label: 'Car', meta: 'Sol rapide', swatch: 'linear-gradient(180deg, #75ffb5 0%, #2cbd7d 100%)' },
      { id: 'vehicle-ship', label: 'Ship', meta: 'Air / hover', swatch: 'linear-gradient(180deg, #77f7ff 0%, #35a9ff 100%)' },
      { id: 'vehicle-boat', label: 'Boat', meta: 'Surface aqua', swatch: 'linear-gradient(180deg, #8bc8ff 0%, #2f6dff 100%)' },
      { id: 'vehicle-kart', label: 'Kart', meta: 'Proto léger', swatch: 'linear-gradient(180deg, #ffe879 0%, #efb92d 100%)' },
    ],
  },
];

const MAX_VISIBLE_VERTICAL_ROWS = 4;

function clampIndex(index, length) {
  if (!length) return 0;
  return (index + length) % length;
}

function getCategoryIndexById(categoryId) {
  return INVENTORY_CATEGORIES.findIndex((category) => category.id === categoryId);
}

function createCategoryButton(category, index, isActive) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'inventoryCategoryButton';
  button.dataset.categoryIndex = String(index);
  button.classList.toggle('is-active', isActive);

  const thumb = document.createElement('span');
  thumb.className = 'inventoryCategoryThumb';
  thumb.textContent = category.icon || '·';
  thumb.style.background = category.swatch || category.accent || '#888';

  const label = document.createElement('span');
  label.className = 'inventoryCategoryLabel';
  label.textContent = category.modeLabel;

  button.append(thumb, label);
  return button;
}

function createListRow(item, isActive) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'inventoryListRow';
  row.classList.toggle('is-active', isActive);

  const swatch = document.createElement('span');
  swatch.className = 'inventoryListSwatch';
  swatch.style.background = item.swatch || 'linear-gradient(180deg, #66ffff 0%, #22a8ff 100%)';

  const text = document.createElement('span');
  text.className = 'inventoryListText';

  const label = document.createElement('div');
  label.className = 'inventoryListTextLabel';
  label.textContent = item.label;

  const meta = document.createElement('div');
  meta.className = 'inventoryListTextMeta';
  meta.textContent = isActive ? item.meta || '' : '';

  text.append(label, meta);
  row.append(swatch, text);
  return row;
}

export function createInventoryMenu(els, callbacks = {}) {
  const state = {
    open: false,
    categoryIndex: 0,
    itemIndexByCategory: Object.fromEntries(INVENTORY_CATEGORIES.map((category) => [category.id, 0])),
  };

  const dom = {
    categoryPrevButton: document.getElementById('inventoryCategoryPrevBtn'),
    categoryNextButton: document.getElementById('inventoryCategoryNextBtn'),
    submenuPrevButton: document.getElementById('inventorySubmenuPrevBtn'),
    submenuNextButton: document.getElementById('inventorySubmenuNextBtn'),
    listViewport: els.submenuGrid ? els.submenuGrid.parentElement : null,
  };

  function getCurrentCategory() {
    return INVENTORY_CATEGORIES[state.categoryIndex] || INVENTORY_CATEGORIES[0];
  }

  function getCurrentItems() {
    return getCurrentCategory().items || [];
  }

  function getCurrentItemIndex() {
    const category = getCurrentCategory();
    return clampIndex(state.itemIndexByCategory[category.id] || 0, Math.max(category.items.length, 1));
  }

  function getCurrentItem() {
    const items = getCurrentItems();
    return items[getCurrentItemIndex()] || null;
  }

  function getSelectionSummary() {
    const category = getCurrentCategory();
    const item = getCurrentItem();
    return item ? `${category.label} • ${item.label}` : category.label;
  }

  function emitSelectionChange() {
    if (typeof callbacks.onSelectionChange !== 'function') return;
    callbacks.onSelectionChange({
      category: getCurrentCategory(),
      item: getCurrentItem(),
    });
  }

  function updateArrowVisibility() {
    const horizontalScrollable = INVENTORY_CATEGORIES.length > 4;
    if (dom.categoryPrevButton) dom.categoryPrevButton.hidden = !horizontalScrollable;
    if (dom.categoryNextButton) dom.categoryNextButton.hidden = !horizontalScrollable;

    const items = getCurrentItems();
    const verticalScrollable = items.length > MAX_VISIBLE_VERTICAL_ROWS;
    if (dom.submenuPrevButton) dom.submenuPrevButton.hidden = !verticalScrollable;
    if (dom.submenuNextButton) dom.submenuNextButton.hidden = !verticalScrollable;
  }

  function updateVerticalWindow() {
    if (!dom.listViewport || !els.submenuGrid) return;
    const rows = Array.from(els.submenuGrid.children);
    if (!rows.length) return;

    const activeIndex = getCurrentItemIndex();
    const rowHeight = rows[0].offsetHeight || 40;
    const computed = window.getComputedStyle(els.submenuGrid);
    const rowGap = Number.parseFloat(computed.rowGap || computed.gap || '0') || 0;
    const step = rowHeight + rowGap;
    const maxStartIndex = Math.max(0, rows.length - MAX_VISIBLE_VERTICAL_ROWS);
    const startIndex = Math.min(activeIndex, maxStartIndex);
    const translateY = -(startIndex * step);

    els.submenuGrid.style.transform = `translateY(${translateY}px)`;
    dom.listViewport.classList.toggle('is-scrollable', rows.length > MAX_VISIBLE_VERTICAL_ROWS);
  }

  function renderCategoryRail() {
    if (!els.categoryGrid) return;
    els.categoryGrid.innerHTML = '';

    INVENTORY_CATEGORIES.forEach((category, index) => {
      const isActive = index === state.categoryIndex;
      const button = createCategoryButton(category, index, isActive);
      button.addEventListener('click', () => {
        state.categoryIndex = index;
        render();
        emitSelectionChange();
      });
      els.categoryGrid.appendChild(button);
    });
  }

  function renderSubmenuList() {
    if (!els.submenuGrid) return;
    els.submenuGrid.innerHTML = '';

    const items = getCurrentItems();
    const activeIndex = getCurrentItemIndex();

    items.forEach((item, index) => {
      const row = createListRow(item, index === activeIndex);
      row.dataset.itemIndex = String(index);
      row.addEventListener('click', () => {
        state.itemIndexByCategory[getCurrentCategory().id] = index;
        render();
        emitSelectionChange();
      });
      els.submenuGrid.appendChild(row);
    });

    requestAnimationFrame(updateVerticalWindow);
  }

  function render() {
    if (els.root) {
      els.root.classList.toggle('is-open', state.open);
      els.root.setAttribute('aria-hidden', state.open ? 'false' : 'true');
    }

    const category = getCurrentCategory();
    const item = getCurrentItem();

    if (els.titleValue) els.titleValue.textContent = category.label;
    if (els.modeValue) {
      els.modeValue.textContent = category.modeLabel;
      els.modeValue.style.color = category.accent;
    }
    if (els.variantValue) {
      els.variantValue.textContent = item ? item.label : '—';
    }
    if (els.descriptionEl) {
      els.descriptionEl.textContent = item ? `${category.description} ${item.label} · ${item.meta}.` : category.description;
    }
    if (els.selectionPillEl) {
      els.selectionPillEl.textContent = item ? item.label : category.modeLabel;
    }
    if (els.helpEl) {
      els.helpEl.textContent = ''; // aide masquée dans cette passe
    }

    renderCategoryRail();
    renderSubmenuList();
    updateArrowVisibility();
  }

  function moveHorizontal(direction) {
    state.categoryIndex = clampIndex(state.categoryIndex + direction, INVENTORY_CATEGORIES.length);
    render();
    emitSelectionChange();
  }

  function moveVertical(direction) {
    const items = getCurrentItems();
    if (!items.length) return;
    const currentIndex = getCurrentItemIndex();
    state.itemIndexByCategory[getCurrentCategory().id] = clampIndex(currentIndex + direction, items.length);
    render();
    emitSelectionChange();
  }

  function sync({ open, modeId } = {}) {
    if (typeof open === 'boolean') {
      state.open = open;
    }

    if (modeId) {
      const nextIndex = getCategoryIndexById(modeId);
      if (nextIndex >= 0) {
        state.categoryIndex = nextIndex;
      }
    }

    render();
  }

  function setOpen(nextOpen) {
    state.open = !!nextOpen;
    render();
  }

  if (els.closeButton) {
    els.closeButton.addEventListener('click', () => {
      if (typeof callbacks.onCloseRequest === 'function') {
        callbacks.onCloseRequest();
        return;
      }
      setOpen(false);
    });
  }

  if (dom.categoryPrevButton) {
    dom.categoryPrevButton.addEventListener('click', () => moveHorizontal(-1));
  }

  if (dom.categoryNextButton) {
    dom.categoryNextButton.addEventListener('click', () => moveHorizontal(1));
  }

  if (dom.submenuPrevButton) {
    dom.submenuPrevButton.addEventListener('click', () => moveVertical(-1));
  }

  if (dom.submenuNextButton) {
    dom.submenuNextButton.addEventListener('click', () => moveVertical(1));
  }

  render();

  return {
    sync,
    setOpen,
    moveHorizontal,
    moveVertical,
    getSelectionSummary,
  };
}
