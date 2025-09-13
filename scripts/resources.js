const RESOURCE_CITY = new URLSearchParams(window.location.search).get('city') || 'nashville';

async function loadResource(type) {
  const ext = type === 'dispatch' ? 'json' : 'html';
  const url = `resources/${RESOURCE_CITY}/${type}.${ext}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to load ${type}`);
  }
  return ext === 'json' ? resp.json() : resp.text();
}

window.resourceLoader = { city: RESOURCE_CITY, loadResource };
