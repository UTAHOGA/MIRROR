// ============================================================================
// API MODULE - Data Fetching & GeoJSON Operations
// ============================================================================
// Handles all remote data fetching with failover logic and error handling

let officialBoundaryLookupPromise = null;

/**
 * Fetch JSON from a URL with error handling
 * @param {string} url - URL to fetch
 * @returns {Promise<Object>}
 */
export async function fetchJson(url) {
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

/**
 * Fetch GeoJSON (delegates to fetchJson)
 * @param {string} url - URL to fetch
 * @returns {Promise<Object>}
 */
export async function fetchGeoJson(url) {
  return fetchJson(url);
}

/**
 * Fetch from first successful URL in array (failover logic)
 * @param {string[]} urls - Array of URLs to try
 * @returns {Promise<Object>}
 */
export async function fetchFirstGeoJson(urls) {
  let lastError = null;
  for (const url of urls) {
    try {
      return await fetchGeoJson(url);
    } catch (error) {
      lastError = error;
      console.error('Failed to load GeoJSON from', url, error);
    }
  }
  throw lastError || new Error('No GeoJSON source succeeded');
}

/**
 * Fetch paginated GeoJSON from ArcGIS FeatureServer
 * @param {string} layerUrl - Base ArcGIS layer URL
 * @param {string} where - WHERE clause for query
 * @param {number} pageSize - Results per page
 * @returns {Promise<Object>}
 */
export async function fetchArcGisPagedGeoJson(layerUrl, where, pageSize = 2000) {
  const allFeatures = [];
  let offset = 0;
  while (true) {
    const url = `${layerUrl}/query?where=${encodeURIComponent(where)}&outFields=*&returnGeometry=true&outSR=4326&f=geojson&resultRecordCount=${pageSize}&resultOffset=${offset}`;
    const geojson = await fetchGeoJson(url);
    const features = Array.isArray(geojson?.features) ? geojson.features : [];
    allFeatures.push(...features);
    if (features.length < pageSize) break;
    offset += pageSize;
  }
  return { type: 'FeatureCollection', features: allFeatures };
}

/**
 * Load and normalize first successful data source
 * @param {string[]} candidates - URLs to try
 * @param {Function} normalizer - Normalize the loaded data
 * @param {*} emptyValue - Return value if all fail
 * @returns {Promise<*>}
 */
export async function loadFirstNormalizedList(candidates, normalizer, emptyValue = []) {
  for (const candidate of candidates) {
    try {
      const json = await fetchJson(candidate);
      const normalized = normalizer(json);
      if (normalized.length) return normalized;
    } catch (error) {
      console.error('Failed to load data from', candidate, error);
    }
  }
  return emptyValue;
}

/**
 * Load official hunt boundary lookup (cached promise)
 * @param {Object} deps - Dependencies (OFFICIAL_HUNT_BOUNDARY_TABLE_SOURCES, normalizeHuntCode, safe)
 * @returns {Promise<Map>}
 */
export async function loadOfficialBoundaryLookup(deps) {
  const { OFFICIAL_HUNT_BOUNDARY_TABLE_SOURCES, normalizeHuntCode, safe } = deps;

  if (!officialBoundaryLookupPromise) {
    officialBoundaryLookupPromise = (async () => {
      const lookup = new Map();
      for (const source of OFFICIAL_HUNT_BOUNDARY_TABLE_SOURCES) {
        try {
          const json = await fetchJson(source);
          const features = Array.isArray(json?.features) ? json.features : [];
          features.forEach(feature => {
            const attrs = feature?.attributes || {};
            const huntCode = normalizeHuntCode(attrs.HUNT_NUMBER);
            const boundaryId = safe(attrs.BOUNDARYID).trim();
            const boundaryName = safe(attrs.BOUNDARY_NAME).trim();
            if (!huntCode || (!boundaryId && !boundaryName)) return;
            const current = lookup.get(huntCode) || { ids: new Set(), names: new Set() };
            if (boundaryId) current.ids.add(boundaryId);
            if (boundaryName) current.names.add(boundaryName);
            lookup.set(huntCode, current);
          });
        } catch (error) {
          console.error(`Failed to load official hunt boundary lookup from ${source}.`, error);
        }
      }
      return lookup;
    })();
  }
  return officialBoundaryLookupPromise;
}

/**
 * Apply official boundary mappings to hunt records
 * @param {Array} records - Hunt records to enhance
 * @param {Object} deps - Dependencies
 * @returns {Promise<void>}
 */
export async function applyOfficialBoundaryMappings(records, deps) {
  const { normalizeHuntCode, getHuntCode, getBoundaryId, safe } = deps;

  const lookup = await loadOfficialBoundaryLookup(deps);
  if (!lookup?.size) return;
  records.forEach(record => {
    const huntCode = normalizeHuntCode(getHuntCode(record));
    if (!huntCode) return;
    const official = lookup.get(huntCode);
    if (!official) return;
    const officialBoundaryIds = Array.from(official.ids || []);
    const officialBoundaryNames = Array.from(official.names || []);
    if (officialBoundaryIds.length) {
      record.officialBoundaryIds = officialBoundaryIds;
      if (!safe(getBoundaryId(record)).trim() && officialBoundaryIds.length === 1) {
        record.boundaryId = officialBoundaryIds[0];
      }
    }
    if (officialBoundaryNames.length) {
      record.officialBoundaryNames = officialBoundaryNames;
    }
  });
}