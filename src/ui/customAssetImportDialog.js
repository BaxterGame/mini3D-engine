function setText(el, text) {
  if (el) el.textContent = text;
}

export function createCustomAssetImportDialog(els, callbacks = {}) {
  let open = false;

  function updateList(records = []) {
    if (!els.assetList) return;
    els.assetList.innerHTML = '';

    if (!records.length) {
      const empty = document.createElement('div');
      empty.className = 'customImportListEmpty';
      empty.textContent = 'Aucun asset custom importé pour le moment.';
      els.assetList.appendChild(empty);
      return;
    }

    records.forEach((record, index) => {
      const row = document.createElement('div');
      row.className = 'customImportListRow';

      const name = document.createElement('div');
      name.className = 'customImportListName';
      name.textContent = `Custom Asset_${index + 1}`;

      const source = document.createElement('div');
      source.className = 'customImportListMeta';
      source.textContent = record.sourceName || record.name || 'asset.obj';

      row.append(name, source);
      els.assetList.appendChild(row);
    });
  }

  function setStatus(message = '') {
    setText(els.status, message);
  }

  function setOpen(nextOpen) {
    open = !!nextOpen;
    if (els.root) {
      els.root.hidden = !open;
      els.root.setAttribute('aria-hidden', open ? 'false' : 'true');
    }
  }

  async function handleFiles(files) {
    if (!files?.length) return;
    setStatus('Import en cours…');

    try {
      const result = typeof callbacks.onFilesSelected === 'function'
        ? await callbacks.onFilesSelected(Array.from(files))
        : { imported: [], rejected: [] };

      const importedCount = result?.imported?.length || 0;
      const rejectedCount = result?.rejected?.length || 0;
      if (importedCount && rejectedCount) {
        setStatus(`${importedCount} OBJ importé(s) • ${rejectedCount} fichier(s) ignoré(s).`);
      } else if (importedCount) {
        setStatus(`${importedCount} OBJ importé(s) dans custom_asset.`);
      } else if (rejectedCount) {
        setStatus('Import refusé. Format supporté : .obj');
      } else {
        setStatus('Aucun fichier importé.');
      }
    } catch (error) {
      console.error(error);
      setStatus('Import impossible. Vérifie le format OBJ.');
    }

    if (els.fileInput) {
      els.fileInput.value = '';
    }
  }

  if (els.closeBtn) {
    els.closeBtn.addEventListener('click', () => {
      setOpen(false);
      if (typeof callbacks.onClose === 'function') callbacks.onClose();
    });
  }

  if (els.fileBtn && els.fileInput) {
    els.fileBtn.addEventListener('click', () => els.fileInput.click());
    els.fileInput.addEventListener('change', (event) => {
      handleFiles(event.target.files);
    });
  }

  if (els.root) {
    els.root.addEventListener('click', (event) => {
      if (event.target !== els.root) return;
      setOpen(false);
      if (typeof callbacks.onClose === 'function') callbacks.onClose();
    });
  }

  if (els.dropzone) {
    const onDragState = (enabled) => {
      els.dropzone.classList.toggle('is-dragover', enabled);
    };

    els.dropzone.addEventListener('dragenter', (event) => {
      event.preventDefault();
      onDragState(true);
    });
    els.dropzone.addEventListener('dragover', (event) => {
      event.preventDefault();
      onDragState(true);
    });
    els.dropzone.addEventListener('dragleave', (event) => {
      if (event.currentTarget.contains(event.relatedTarget)) return;
      onDragState(false);
    });
    els.dropzone.addEventListener('drop', (event) => {
      event.preventDefault();
      onDragState(false);
      handleFiles(event.dataTransfer?.files);
    });
  }

  setOpen(false);

  return {
    open() {
      setOpen(true);
      setStatus('Formats supportés pour cette première version : .obj');
      if (typeof callbacks.onOpen === 'function') callbacks.onOpen();
    },
    close() {
      setOpen(false);
    },
    isOpen() {
      return open;
    },
    updateList,
    setStatus,
  };
}
