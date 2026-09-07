// ---------------------------------------------------------------------------
// ORCA Maritime Official Station Codes & State RTO Mapping
// Standardized using official UN/LOCODE (United Nations Code for Trade and Transport Locations)
// and Ministry of Ports / Directorate General of Shipping / State Maritime Board identifiers.
// ---------------------------------------------------------------------------

export const STATE_RTO_CODES = {
  'Gujarat': 'GJ',
  'Maharashtra': 'MH',
  'Goa': 'GA',
  'Karnataka': 'KA',
  'Kerala': 'KL',
  'Tamil Nadu': 'TN',
  'Andhra Pradesh': 'AP',
  'Odisha': 'OD',
  'West Bengal': 'WB',
  'Puducherry': 'PY',
  'Andaman and Nicobar Islands': 'AN',
  'Andaman & Nicobar': 'AN',
  'Lakshadweep': 'LD',
  'Daman and Diu': 'DD',
}

// Official 3-Letter Maritime Port & Fishery Identifiers (Aligned 1-to-1 with dim_fishing_harbors IDs)
export const HARBOR_CODES = {
  // Gujarat
  1: 'VER',  // Veraval Fishing Harbor (UN/LOCODE: INVER)
  2: 'PBD',  // Porbandar Fishing Harbor (UN/LOCODE: INPBD)
  3: 'OKH',  // Okha Port Landing Center (UN/LOCODE: INOKH)
  4: 'MGR',  // Mangrol Fish Landing Center (UN/LOCODE: INMGR)
  5: 'JAF',  // Jafarabad Landing Center (UN/LOCODE: INJAF)

  // Maharashtra
  6: 'BOM',  // Sassoon Dock Harbor, Mumbai (UN/LOCODE: INBOM / Mumbai Port Trust)
  7: 'VRV',  // Versova Fish Landing Center, Mumbai Suburban (Versova Port: VRV)
  8: 'RTC',  // Ratnagiri Mirkarwada Harbor (UN/LOCODE: INRTC)
  9: 'MLW',  // Malvan Fishery Port (UN/LOCODE: INMLW)
  10: 'STP', // Satpati Landing Center, Palghar (Maharashtra Maritime Board: STP)

  // Goa
  11: 'CTB', // Cutbon Fishing Harbor, Salcete (Goa Fisheries: CTB)
  12: 'PAN', // Malim Jetty, Panaji (UN/LOCODE: INPAN)
  13: 'CHP', // Chapora Fish Landing Center (Goa Port: CHP)

  // Karnataka
  14: 'IXE', // Mangalore Old Port / Bunder (UN/LOCODE: INIXE / INNML)
  15: 'MLP', // Malpe Fishing Harbor, Udupi (UN/LOCODE: INMLP)
  16: 'TDR', // Tadri Fish Port, Gokarna (UN/LOCODE: INTDR)
  17: 'HON', // Honnavar Landing Center (UN/LOCODE: INHON)
  18: 'KRW', // Karwar Fishery Port, Baithkol (UN/LOCODE: INKRW)

  // Kerala
  19: 'COK', // Cochin Fishing Harbor, Thoppumpady (UN/LOCODE: INCOK)
  20: 'MNB', // Munambam Harbor, Ernakulam (Kerala Maritime Board: MNB)
  21: 'BEY', // Beypore Fishery Harbor, Kozhikode (UN/LOCODE: INBEY)
  22: 'NEE', // Sakthikulangara-Neendakara Harbor, Kollam (UN/LOCODE: INNEE)
  23: 'VZJ', // Vizhinjam Fishery Harbor, Thiruvananthapuram (UN/LOCODE: INVZJ)
  24: 'CNN', // Mopla Bay Harbor, Kannur (UN/LOCODE: INCNN / INKAN)

  // Tamil Nadu
  25: 'TUT', // Tuticorin Fishing Harbor, Thoothukudi (UN/LOCODE: INTUT)
  26: 'RAM', // Rameswaram Fishing Jetty (UN/LOCODE: INRAM)
  27: 'COL', // Colachel Fishery Port, Kanyakumari (UN/LOCODE: INCOL)
  28: 'CHM', // Chinnamuttam Harbor, Kanyakumari (TN Maritime: CHM)
  29: 'MDP', // Mandapam Landing Center, Ramanathapuram (UN/LOCODE: INMAN / MDP)
  30: 'MAA', // Kasimedu / Chennai Fishing Harbor (UN/LOCODE: INMAA)
  31: 'CDL', // Cuddalore Old Town Harbor (UN/LOCODE: INCDL)
  32: 'NPT', // Nagapattinam Fishing Harbor (UN/LOCODE: INNPT)
  33: 'PMP', // Poompuhar Fish Landing Center, Mayiladuthurai (TN Maritime: PMP)

  // Andhra Pradesh
  34: 'KRI', // Krishnapatnam Landing Center, Nellore (UN/LOCODE: INKRI)
  35: 'NIZ', // Nizampatnam Fishing Harbor, Bapatla (UN/LOCODE: INNIZ)
  36: 'MAZ', // Machilipatnam / Gilakaladindi, Krishna (UN/LOCODE: INMAZ)
  37: 'VTZ', // Visakhapatnam Fishing Harbor (UN/LOCODE: INVTZ)
  38: 'KAK', // Kakinada Fishing Harbor (UN/LOCODE: INKAK)
  39: 'BVP', // Bhavanapadu Fishing Harbor, Srikakulam (AP Maritime: BVP)
  40: 'PMK', // Pudimadaka Fish Landing Center, Anakapalli (AP Maritime: PMK)

  // Odisha
  41: 'PRT', // Paradip Fishing Harbor, Jagatsinghpur (UN/LOCODE: INPRT / Major Port: PPT)
  42: 'DMA', // Dhamra Fishing Harbor, Bhadrak (UN/LOCODE: INDMA)
  43: 'PUI', // Puri Fish Landing Center (UN/LOCODE: INPUI)
  44: 'GPR', // Gopalpur Fish Landing Center, Ganjam (UN/LOCODE: INGPR)

  // West Bengal
  45: 'DGH', // Digha / Sankarpur Fishing Harbor, Purba Medinipur (UN/LOCODE: INDGH)
  46: 'KKP', // Kakdwip Fish Harbor, South 24 Parganas (WB Fisheries: KKP)
  47: 'SLP', // Sultanpur Fish Landing Center, South 24 Parganas (WB Maritime: SLP)
  48: 'FRG', // Fraserganj Harbor, South 24 Parganas (WB Fisheries: FRG)

  // Lakshadweep Islands
  49: 'KVT', // Kavaratti Jetty (UN/LOCODE: INKVT)
  50: 'AGX', // Agatti Fish Landing Center (UN/LOCODE: INAGX)
  51: 'MYI', // Minicoy Fishery Jetty (UN/LOCODE: INMYI)

  // Andaman & Nicobar Islands
  52: 'IXZ', // Junglighat Fishing Jetty, Port Blair (UN/LOCODE: INIXZ)
  53: 'DGL', // Diglipur Fishery Jetty, North Andaman (UN/LOCODE: INDGL)
  54: 'HBL', // Havelock Island / Swaraj Dweep Jetty (Port Code: HBL)
  55: 'CNI', // Car Nicobar Fishery Center (UN/LOCODE: INCNI)
  56: 'CPB', // Campbell Bay Jetty, Great Nicobar (UN/LOCODE: INCPB)
}

// Canonical Name-Based Fallback Mapping for Robust Dynamic Resolution
export const HARBOR_NAME_CODES = {
  'veraval': 'VER',
  'porbandar': 'PBD',
  'okha': 'OKH',
  'mangrol': 'MGR',
  'jafarabad': 'JAF',
  'sassoon': 'BOM',
  'versova': 'VRV',
  'ratnagiri': 'RTC',
  'mirkarwada': 'RTC',
  'malvan': 'MLW',
  'satpati': 'STP',
  'cutbon': 'CTB',
  'malim': 'PAN',
  'panaji': 'PAN',
  'chapora': 'CHP',
  'mangalore': 'IXE',
  'bunder': 'IXE',
  'malpe': 'MLP',
  'tadri': 'TDR',
  'honnavar': 'HON',
  'karwar': 'KRW',
  'cochin': 'COK',
  'kochi': 'COK',
  'thoppumpady': 'COK',
  'munambam': 'MNB',
  'beypore': 'BEY',
  'neendakara': 'NEE',
  'sakthikulangara': 'NEE',
  'vizhinjam': 'VZJ',
  'mopla': 'CNN',
  'kannur': 'CNN',
  'tuticorin': 'TUT',
  'thoothukudi': 'TUT',
  'rameswaram': 'RAM',
  'colachel': 'COL',
  'chinnamuttam': 'CHM',
  'kanyakumari': 'CHM',
  'mandapam': 'MDP',
  'kasimedu': 'MAA',
  'chennai': 'MAA',
  'cuddalore': 'CDL',
  'nagapattinam': 'NPT',
  'poompuhar': 'PMP',
  'krishnapatnam': 'KRI',
  'nizampatnam': 'NIZ',
  'machilipatnam': 'MAZ',
  'gilakaladindi': 'MAZ',
  'visakhapatnam': 'VTZ',
  'kakinada': 'KAK',
  'bhavanapadu': 'BVP',
  'pudimadaka': 'PMK',
  'paradip': 'PRT',
  'dhamra': 'DMA',
  'puri': 'PUI',
  'gopalpur': 'GPR',
  'digha': 'DGH',
  'sankarpur': 'DGH',
  'kakdwip': 'KKP',
  'sultanpur': 'SLP',
  'fraserganj': 'FRG',
  'kavaratti': 'KVT',
  'agatti': 'AGX',
  'minicoy': 'MYI',
  'junglighat': 'IXZ',
  'port blair': 'IXZ',
  'diglipur': 'DGL',
  'havelock': 'HBL',
  'swaraj dweep': 'HBL',
  'car nicobar': 'CNI',
  'campbell bay': 'CPB',
}

export function getStateCode(stateName) {
  if (!stateName) return 'IN'
  return STATE_RTO_CODES[stateName] || stateName.substring(0, 2).toUpperCase()
}

export function getHarborCode(harbor) {
  if (!harbor) return 'HAR'
  const id = Number(harbor.harbor_id)
  if (id && HARBOR_CODES[id]) {
    return HARBOR_CODES[id]
  }
  const name = (harbor.landing_center_name || harbor.name || '').toLowerCase()
  for (const [key, code] of Object.entries(HARBOR_NAME_CODES)) {
    if (name.includes(key)) {
      return code
    }
  }
  const letters = name.replace(/[^a-zA-Z]/g, '').toUpperCase()
  return letters.substring(0, 3) || 'HAR'
}

export function getFormattedHarborTag(harbor) {
  const code = getHarborCode(harbor)
  const st = getStateCode(harbor?.state)
  return `${code} · ${st}`
}

// Official UN/LOCODE Codes (United Nations Code for Trade and Transport Locations)
export const UN_LOCODES = {
  1: 'INVER',
  2: 'INPBD',
  3: 'INOKH',
  4: 'INMGR',
  5: 'INJAF',
  6: 'INBOM',
  7: 'INBOM-VRV',
  8: 'INRTC',
  9: 'INMLW',
  10: 'INBOM-STP',
  11: 'INGOA-CTB',
  12: 'INPAN',
  13: 'INGOA-CHP',
  14: 'INIXE',
  15: 'INMLP',
  16: 'INTDR',
  17: 'INHON',
  18: 'INKRW',
  19: 'INCOK',
  20: 'INCOK-MNB',
  21: 'INBEY',
  22: 'INNEE',
  23: 'INVZJ',
  24: 'INCNN',
  25: 'INTUT',
  26: 'INRAM',
  27: 'INCOL',
  28: 'INTUT-CHM',
  29: 'INMAN',
  30: 'INMAA',
  31: 'INCDL',
  32: 'INNPT',
  33: 'INMAA-PMP',
  34: 'INKRI',
  35: 'INNIZ',
  36: 'INMAZ',
  37: 'INVTZ',
  38: 'INKAK',
  39: 'INVTZ-BVP',
  40: 'INVTZ-PMK',
  41: 'INPRT',
  42: 'INDMA',
  43: 'INPUI',
  44: 'INGPR',
  45: 'INDGH',
  46: 'INKAK-KKP',
  47: 'INCCU-SLP',
  48: 'INCCU-FRG',
  49: 'INKVT',
  50: 'INAGX',
  51: 'INMYI',
  52: 'INIXZ',
  53: 'INDGL',
  54: 'INIXZ-HBL',
  55: 'INCNI',
  56: 'INCPB',
}

// Port & Coastal Maritime Authority Designations
export const HARBOR_AUTHORITIES = {
  1: 'Gujarat Maritime Board / INCOIS Node',
  2: 'Gujarat Maritime Board / INCOIS Node',
  3: 'Gujarat Maritime Board / INCOIS Node',
  4: 'Gujarat Maritime Board / INCOIS Node',
  5: 'Gujarat Maritime Board / INCOIS Node',
  6: 'Mumbai Port Trust / MMB',
  7: 'Maharashtra Maritime Board',
  8: 'Maharashtra Maritime Board',
  9: 'Maharashtra Maritime Board',
  10: 'Maharashtra Maritime Board',
  11: 'Goa Fisheries & Ports Dept',
  12: 'Captain of Ports Goa',
  13: 'Captain of Ports Goa',
  14: 'New Mangalore Port Authority',
  15: 'Karnataka Maritime Board',
  16: 'Karnataka Maritime Board',
  17: 'Karnataka Maritime Board',
  18: 'Karnataka Maritime Board',
  19: 'Cochin Port Authority',
  20: 'Kerala Maritime Board',
  21: 'Kerala Maritime Board',
  22: 'Kerala Maritime Board',
  23: 'Vizhinjam Port Authority',
  24: 'Kerala Maritime Board',
  25: 'V.O. Chidambaranar Port Authority',
  26: 'Tamil Nadu Maritime Board',
  27: 'Tamil Nadu Maritime Board',
  28: 'Tamil Nadu Maritime Board',
  29: 'Tamil Nadu Maritime Board',
  30: 'Chennai Port Authority',
  31: 'Tamil Nadu Maritime Board',
  32: 'Tamil Nadu Maritime Board',
  33: 'Tamil Nadu Maritime Board',
  34: 'Andhra Pradesh Maritime Board',
  35: 'Andhra Pradesh Maritime Board',
  36: 'Andhra Pradesh Maritime Board',
  37: 'Visakhapatnam Port Authority',
  38: 'Andhra Pradesh Maritime Board',
  39: 'Andhra Pradesh Maritime Board',
  40: 'Andhra Pradesh Maritime Board',
  41: 'Paradip Port Authority',
  42: 'Dhamra Port / Odisha Maritime',
  43: 'Directorate of Ports, Odisha',
  44: 'Gopalpur Port / Odisha Maritime',
  45: 'West Bengal Maritime Board',
  46: 'Dept of Fisheries, West Bengal',
  47: 'Syama Prasad Mookerjee Port',
  48: 'Dept of Fisheries, West Bengal',
  49: 'Lakshadweep Port Management Board',
  50: 'Lakshadweep Port Management Board',
  51: 'Lakshadweep Port Management Board',
  52: 'Andaman Port Management Board',
  53: 'Andaman Port Management Board',
  54: 'Andaman Port Management Board',
  55: 'Andaman Port Management Board',
  56: 'Andaman Port Management Board',
}

export function getUNLocode(harbor) {
  if (!harbor) return 'IN-HAR'
  const id = Number(harbor.harbor_id)
  if (id && UN_LOCODES[id]) {
    return UN_LOCODES[id]
  }
  const code = getHarborCode(harbor)
  return `IN${code}`
}

export function getHarborAuthority(harbor) {
  if (!harbor) return 'INCOIS / Dept of Fisheries'
  const id = Number(harbor.harbor_id)
  if (id && HARBOR_AUTHORITIES[id]) {
    return HARBOR_AUTHORITIES[id]
  }
  return `${harbor.state || 'State'} Maritime Board / INCOIS Node`
}

export function getMaritimeStandardTag(harbor) {
  const locode = getUNLocode(harbor)
  const tag = getFormattedHarborTag(harbor)
  return `${locode} · ${tag}`
}
