// ╔════════════════════════════════════════════════════════════════════════════════════════╗
// ║              OPTIMIZED SNOW ALBEDO ANALYSIS - SASKATCHEWAN GLACIER                     ║
// ║                    MODIS MOD10A1.061 (2010-2024) - Research Grade                     ║
// ║                        MOD10A1_albedo_high_snow_cover_optimized.js                     ║
// ╚════════════════════════════════════════════════════════════════════════════════════════╝

// ┌─────────────────────────────── 🚀 QUICK START GUIDE 🚀 ───────────────────────────────────┐
// │                                                                                        │
// │ 🎯 PURPOSE: Extract high-quality snow albedo data with comprehensive QA filtering     │
// │                                                                                        │
// │ 📊 WORKFLOW:                                                                           │
// │   1. 🔄 Script auto-loads → Statistics appear in console                             │
// │   2. ⬅️ Interact with LEFT panel → Adjust filtering parameters                       │
// │   3. ➡️ Interact with RIGHT panel → Fine-tune quality controls                       │
// │   4. 🖱️ Click map pixels → Get detailed QA inspection                               │
// │   5. 📤 Run exports → Get publication-ready CSV data                                 │
// │                                                                                        │
// │ 🔧 KEY FEATURES:                                                                       │
// │   • 📈 Deep statistical analysis (Sen's slope, change points, anomaly detection)     │
// │   • ⚡ Interactive parameter optimization with real-time feedback                    │
// │   • ☁️ Comprehensive QA with MOD10A1 v6.1 cloud detection                          │
// │   • 🔬 Research-grade filtering: NDSI snow + glacier fraction + quality masks       │
// │   • 📊 Export both annual summaries and daily time series                           │
// │                                                                                        │
// │ 📈 SCIENTIFIC METHODS:                                                                │
// │   • 📉 Sen's slope estimator (robust trend detection)                               │
// │   • 🔍 Change point analysis (structural breaks)                                    │
// │   • 🔄 Autocorrelation assessment (temporal persistence)                            │
// │   • ⚠️ Anomaly detection (extreme event identification)                             │
// │   • 🌡️ Climate signal analysis (early vs late period comparison)                   │
// │                                                                                        │
// │ ⚙️ DEFAULT SETTINGS (Conservative for publication):                                   │
// │   • ❄️ NDSI Snow Threshold: 0 (index 0-100)                                        │
// │   • 🏔️ Glacier Fraction: ≥75% (pure glacier focus)                                │
// │   • ✅ Quality Level: Good+ (0-1, excludes poor quality)                           │
// │   • ☁️ Cloud Detection: v6.1 enabled (excludes cloudy pixels)                      │
// │   • 🌞 Season: June-September (extended melt period)                              │
// │                                                                                        │
// │ 📋 EXPORTS GENERATED:                                                                 │
// │   • 📅 Annual statistics by glacier fraction class (2010-2024)                     │
// │   • 📈 Daily albedo time series with comprehensive metadata                         │
// │   • 🔬 Pixel-level data with individual QA flags (NEW!)                            │
// │   • 🐍 Quality-controlled data ready for Python analysis pipeline                  │
// │                                                                                        │
// │ 🔍 QUALITY CONTROL:                                                                   │
// │   • 🌙 Basic QA: Excludes night, ocean, poor quality pixels                        │
// │   • 🚩 Algorithm Flags: Excludes failed screens, cloudy conditions                 │
// │   • 🗺️ Spatial Filter: Minimum glacier fraction thresholds                        │
// │   • ⏰ Temporal Filter: Statistical reliability minimums                            │
// │                                                                                        │
// │ 💡 TIPS:                                                                              │
// │   • 🎛️ Use LEFT panel sliders to optimize parameters for your research             │
// │   • 📊 Check RIGHT panel for QA retention rates                                    │
// │   • 🖱️ Click map to inspect individual pixel quality                               │
// │   • ⚠️ Adjust thresholds if "insufficient pixels" warnings appear                  │
// │   • 💾 Export parameters once satisfied with filtering results                     │
// │                                                                                        │
// └────────────────────────────────────────────────────────────────────────────────────┘

// ┌────────────────────────────────────────────────────────────────────────────────────────┐
// │ SECTION 1: CONFIGURATION & INITIALIZATION                                             │
// └────────────────────────────────────────────────────────────────────────────────────────┘

// 1. Paramètres configurables
var NDSI_SNOW_THRESHOLD = 0; // Minimum NDSI Snow Cover threshold (index 0-100, not percentage)
var GLACIER_FRACTION_THRESHOLD = 75; // Seuil minimal de fraction glacier dans le pixel (%)
var MIN_PIXEL_THRESHOLD = 10; // Nombre minimum de pixels requis pour fiabilité statistique
var FRACTION_THRESHOLDS = [0.25, 0.50, 0.75, 0.90]; // Seuils de fraction glacier pour classes
var STUDY_YEARS = ee.List([2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]);
var SUMMER_START_MONTH = 6;  // Juin (extended melt season)
var SUMMER_END_MONTH = 9;    // Septembre
var USE_PEAK_MELT_ONLY = false; // Si false, utilise juin-septembre au lieu de juillet-septembre

// Class names for glacier fraction categories with actual percentage ranges
var FRACTION_CLASS_NAMES = ['glacier_0_25pct', 'glacier_25_50pct', 'glacier_50_75pct', 'glacier_75_90pct', 'glacier_90_100pct'];
var ANNUAL_CLASS_NAMES = ['glacier_0_25pct_high_snow', 'glacier_25_50pct_high_snow', 'glacier_50_75pct_high_snow', 
                          'glacier_75_90pct_high_snow', 'glacier_90_100pct_high_snow'];

// 2. Charger l'asset du glacier Saskatchewan
// ⚠️ LIMITATION SCIENTIFIQUE IMPORTANTE :
// Ce script utilise un masque glaciaire statique de 2024 pour toute la période 2010-2024.
// Les changements de géométrie glaciaire au cours de cette période ne sont PAS pris en compte.
// Cela peut introduire des biais dans l'analyse temporelle, particulièrement pour les années
// les plus éloignées de 2024. Les tendances à long terme doivent être interprétées avec 
// cette limitation en considération.
var saskatchewan_glacier = ee.Image('projects/tofunori/assets/Saskatchewan_glacier_2024_updated');
var glacier_mask = saskatchewan_glacier.gt(0);
var glacier_geometry = glacier_mask.reduceToVectors({
  scale: 30,
  maxPixels: 1e6,
  tileScale: 2
}).geometry();

// ┌────────────────────────────────────────────────────────────────────────────────────────┐
// │ SECTION 2 : CALCUL STATIQUE DE LA FRACTION GLACIER (OPTIMISATION)                      │
// └────────────────────────────────────────────────────────────────────────────────────────┘

// 3. Calculer la fraction glacier une seule fois (optimisation performance)
print('Computing static glacier fraction...');

// Obtenir une projection MODIS de référence
var modis_reference = ee.ImageCollection('MODIS/061/MOD10A1')
  .filterDate('2020-01-01', '2020-01-02')
  .first();
var modis_projection = modis_reference.projection();

// Calculer la fraction glacier globale une seule fois
var raster30 = ee.Image.constant(1)
  .updateMask(glacier_mask)
  .unmask(0)
  .reproject(modis_projection, null, 30);

var STATIC_GLACIER_FRACTION = raster30
  .reduceResolution({
    reducer: ee.Reducer.mean(),
    maxPixels: 1024
  })
  .reproject(modis_projection, null, 500);

print('Glacier fraction computed. Min/Max:', 
  STATIC_GLACIER_FRACTION.reduceRegion({
    reducer: ee.Reducer.minMax(),
    geometry: glacier_geometry,
    scale: 500,
    maxPixels: 1e9,
    tileScale: 2
  }));

// ┌────────────────────────────────────────────────────────────────────────────────────────┐
// │ SECTION 3 : FONCTIONS OPTIMISÉES                                                       │
// └────────────────────────────────────────────────────────────────────────────────────────┘

// 4. Helper function for padding binary strings (GEE compatible)
function padBinary(num, length) {
  var binary = num.toString(2);
  var padding = '';
  for (var i = binary.length; i < length; i++) {
    padding += '0';
  }
  return padding + binary;
}

// 5. Fonction optimisée pour créer masques de fraction (version simplifiée fiable)
function createFractionMasks(fractionImage, thresholds) {
  var masks = {};
  masks['glacier_0_25pct'] = fractionImage.gt(0).and(fractionImage.lt(thresholds[0]));
  masks['glacier_25_50pct'] = fractionImage.gte(thresholds[0]).and(fractionImage.lt(thresholds[1]));
  masks['glacier_50_75pct'] = fractionImage.gte(thresholds[1]).and(fractionImage.lt(thresholds[2]));
  masks['glacier_75_90pct'] = fractionImage.gte(thresholds[2]).and(fractionImage.lt(thresholds[3]));
  masks['glacier_90_100pct'] = fractionImage.gte(thresholds[3]);
  return masks;
}

// 5. Fonctions pour filtrage qualité complet basé sur documentation officielle GEE
function getBasicQAMask(img, level) {
  var basicQA = img.select('NDSI_Snow_Cover_Basic_QA');
  
  // Valeurs officielles GEE MOD10A1.061:
  // 0: Best quality, 1: Good quality, 2: OK quality, 3: Poor quality
  // 211: Night, 239: Ocean
  
  var qualityMask;
  switch(level) {
    case 'best': qualityMask = basicQA.eq(0); break;
    case 'good': qualityMask = basicQA.lte(1); break;  // DEFAULT
    case 'ok': qualityMask = basicQA.lte(2); break;
    case 'all': qualityMask = basicQA.lte(3); break;
    default: qualityMask = basicQA.lte(1); // Default to good
  }
  
  // Toujours exclure nuit et océan
  var excludeMask = basicQA.neq(211).and(basicQA.neq(239));
  
  return qualityMask.and(excludeMask);
}

// QA bit mapping for metadata-driven processing
var QA_BIT_MAPPING = [
  {flag: 'excludeInlandWater', bit: 0, mask: 1, desc: 'Inland water'},
  {flag: 'excludeVisibleScreenFail', bit: 1, mask: 2, desc: 'Low visible screen failure'},
  {flag: 'excludeNDSIScreenFail', bit: 2, mask: 4, desc: 'Low NDSI screen failure'},
  {flag: 'excludeTempHeightFail', bit: 3, mask: 8, desc: 'Temperature/height screen failure'},
  {flag: 'excludeSWIRAnomaly', bit: 4, mask: 16, desc: 'Shortwave IR reflectance anomaly'},
  {flag: 'excludeProbablyCloudy', bit: 5, mask: 32, desc: 'Probably cloudy (v6.1 cloud detection)'},
  {flag: 'excludeProbablyClear', bit: 6, mask: 64, desc: 'Probably clear (v6.1 cloud detection)'},
  {flag: 'excludeHighSolarZenith', bit: 7, mask: 128, desc: 'Solar zenith >70°'}
];

function getAlgorithmFlagsMask(img, flags) {
  var algFlags = img.select('NDSI_Snow_Cover_Algorithm_Flags_QA').uint8();
  var mask = ee.Image(1);
  
  // Metadata-driven QA bit processing
  QA_BIT_MAPPING.forEach(function(mapping) {
    if (flags[mapping.flag]) {
      mask = mask.and(algFlags.bitwiseAnd(mapping.mask).eq(0));
    }
  });
  
  return mask;
}

// Helper function to create current QA mask from UI state
function createCurrentQAMask(img) {
  var basicLevel = basicQASelect.getValue();
  var flagConfig = {
    excludeInlandWater: flagCheckboxes.inlandWater.getValue(),
    excludeVisibleScreenFail: flagCheckboxes.visibleScreenFail.getValue(),
    excludeNDSIScreenFail: flagCheckboxes.ndsiScreenFail.getValue(),
    excludeTempHeightFail: flagCheckboxes.tempHeightFail.getValue(),
    excludeSWIRAnomaly: flagCheckboxes.swirAnomaly.getValue(),
    excludeProbablyCloudy: flagCheckboxes.probablyCloudy.getValue(),
    excludeProbablyClear: flagCheckboxes.probablyClear.getValue(),
    excludeHighSolarZenith: flagCheckboxes.highSolarZenith.getValue()
  };
  
  return getBasicQAMask(img, basicLevel).and(getAlgorithmFlagsMask(img, flagConfig));
}

function createComprehensiveQualityMask(img, qaConfig) {
  // Fonction principale combinant Basic QA et Algorithm Flags
  var basicMask = getBasicQAMask(img, qaConfig.basicLevel || 'good');
  var flagsMask = getAlgorithmFlagsMask(img, qaConfig);
  
  return basicMask.and(flagsMask);
}

// Fonction de compatibilité pour code existant
function createQualityMask(qualityBand) {
  // Maintient compatibilité avec code existant (Basic QA level ≤ 1)
  return qualityBand.bitwiseAnd(0x3).lte(1);
}

// Configuration QA par défaut pour exports (consistent avec l'approche conservatrice recommandée)
// IMPORTANT: Cette configuration est utilisée pour tous les exports de données (annual + daily)
// tandis que l'interface interactive permet de tester différents paramètres pour la visualisation
function createStandardQualityMask(img) {
  var qaConfig = {
    basicLevel: 'good',                    // Good quality+ (0-1) - recommandation standard
    excludeInlandWater: true,              // IMPORTANT - exclure pixels eau/lacs glaciaires
    excludeVisibleScreenFail: true,        // CRITIQUE - données visible corrompues
    excludeNDSIScreenFail: true,           // CRITIQUE - NDSI non-fiable
    excludeTempHeightFail: true,           // IMPORTANT - conditions atypiques
    excludeSWIRAnomaly: true,              // IMPORTANT - anomalies optiques SWIR
    excludeProbablyCloudy: true,           // CRITIQUE - cloud masking v6.1 (Bit 5)
    excludeProbablyClear: false,           // OPTIONNEL - ne pas exclure les pixels clairs (Bit 6)
    excludeHighSolarZenith: true           // IMPORTANT - éclairage faible
  };
  
  return createComprehensiveQualityMask(img, qaConfig);
}

// ┌────────────────────────────────────────────────────────────────────────────────────────┐
// │ SECTION 4 : ANALYSE ANNUELLE OPTIMISÉE                                                │
// └────────────────────────────────────────────────────────────────────────────────────────┘

// 6. Fonction pour analyser l'albédo annuel avec optimisations
function calculateAnnualAlbedoHighSnowCoverOptimized(year) {
  var yearStart = ee.Date.fromYMD(year, USE_PEAK_MELT_ONLY ? 7 : SUMMER_START_MONTH, 1);
  var yearEnd = ee.Date.fromYMD(year, SUMMER_END_MONTH, 30);
  
  // Charger MOD10A1 avec clip pour réduire zone de calcul (incluant Algorithm_Flags_QA)
  var mod10a1_collection = ee.ImageCollection('MODIS/061/MOD10A1')
    .filterDate(yearStart, yearEnd)
    .filterBounds(glacier_geometry)
    .select(['NDSI_Snow_Cover', 'Snow_Albedo_Daily_Tile', 'NDSI_Snow_Cover_Basic_QA', 'NDSI_Snow_Cover_Algorithm_Flags_QA'])
    .map(function(img) { return img.clip(glacier_geometry); });
  
  // Traiter chaque image avec fraction statique
  var processed_collection = mod10a1_collection.map(function(img) {
    var snow_cover = img.select('NDSI_Snow_Cover');
    var snow_albedo = img.select('Snow_Albedo_Daily_Tile');
    
    // Masques de qualité améliorés - utilise configuration QA standard pour exports
    var good_quality_mask = createStandardQualityMask(img);
    var high_ndsi_mask = snow_cover.gte(NDSI_SNOW_THRESHOLD); // NDSI index ≥ threshold
    var high_glacier_fraction_mask = STATIC_GLACIER_FRACTION.gte(GLACIER_FRACTION_THRESHOLD / 100);
    var valid_albedo_mask = snow_albedo.lte(100);
    
    // Masque combiné
    var combined_mask = good_quality_mask
      .and(high_ndsi_mask)
      .and(high_glacier_fraction_mask)
      .and(valid_albedo_mask);
    
    // Conversion albédo avec nom cohérent
    var albedo_scaled = snow_albedo.divide(100)
      .updateMask(combined_mask)
      .rename('albedo'); // Nom cohérent pour reduceRegion
    
    // Créer les masques par classe de fraction (approche fiable)
    var masks = createFractionMasks(STATIC_GLACIER_FRACTION, FRACTION_THRESHOLDS);
    
    // Appliquer les masques de fraction à l'albédo
    var masked_albedos = [
      albedo_scaled.updateMask(masks.glacier_0_25pct).rename('glacier_0_25pct_high_snow'),
      albedo_scaled.updateMask(masks.glacier_25_50pct).rename('glacier_25_50pct_high_snow'),
      albedo_scaled.updateMask(masks.glacier_50_75pct).rename('glacier_50_75pct_high_snow'),
      albedo_scaled.updateMask(masks.glacier_75_90pct).rename('glacier_75_90pct_high_snow'),
      albedo_scaled.updateMask(masks.glacier_90_100pct).rename('glacier_90_100pct_high_snow')
    ];
    
    // Ajouter une bande pour compter les pixels avec haute couverture de neige
    var high_snow_count = combined_mask.rename('high_snow_pixel_count');
    
    return ee.Image.cat(masked_albedos.concat([high_snow_count]));
  });
  
  // Séparer les statistiques d'albédo et de comptage de pixels
  var albedo_means = processed_collection.select(ANNUAL_CLASS_NAMES).mean();
  var pixel_count_total = processed_collection.select('high_snow_pixel_count').sum();
  
  // Calculer les statistiques d'albédo pour chaque classe
  var all_stats = albedo_means.reduceRegion({
    reducer: ee.Reducer.mean().combine(
      ee.Reducer.stdDev(), '', true
    ).combine(
      ee.Reducer.count(), '', true
    ),
    geometry: glacier_geometry,
    scale: 500,
    maxPixels: 1e9,
    tileScale: 4 // Remplace bestEffort
  });
  
  // Calculer le nombre total de pixels filtrés (correctement)
  var filtered_pixel_stats = pixel_count_total.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: glacier_geometry,
    scale: 500,
    maxPixels: 1e9,
    tileScale: 4
  });
  
  // Construire les propriétés avec validation MIN_PIXEL_THRESHOLD
  var total_pixels = filtered_pixel_stats.get('high_snow_pixel_count');
  var sufficient_pixels = ee.Number(total_pixels).gte(MIN_PIXEL_THRESHOLD);
  
  var properties = {
    'year': year,
    'ndsi_snow_threshold': NDSI_SNOW_THRESHOLD,
    'glacier_fraction_threshold': GLACIER_FRACTION_THRESHOLD,
    'min_pixel_threshold': MIN_PIXEL_THRESHOLD,
    'peak_melt_only': USE_PEAK_MELT_ONLY,
    'total_filtered_pixels': total_pixels,
    'sufficient_pixels': sufficient_pixels
  };
  
  ANNUAL_CLASS_NAMES.forEach(function(className) {
    // Appliquer MIN_PIXEL_THRESHOLD validation pour chaque classe
    var class_count = all_stats.get(className + '_count');
    var class_sufficient = ee.Number(class_count).gte(MIN_PIXEL_THRESHOLD);
    
    properties[className + '_mean'] = ee.Algorithms.If(class_sufficient, all_stats.get(className + '_mean'), null);
    properties[className + '_stdDev'] = ee.Algorithms.If(class_sufficient, all_stats.get(className + '_stdDev'), null);
    properties[className + '_count'] = class_count;
    properties[className + '_sufficient_pixels'] = class_sufficient;
  });
  
  return ee.Feature(null, properties);
}

// ┌────────────────────────────────────────────────────────────────────────────────────────┐
// │ SECTION 5 : ANALYSE QUOTIDIENNE OPTIMISÉE                                             │
// └────────────────────────────────────────────────────────────────────────────────────────┘

// 7. Fonction pour analyser l'albédo quotidien optimisée
function analyzeDailyAlbedoHighSnowCoverOptimized(img) {
  var date = img.date();
  var snow_cover = img.select('NDSI_Snow_Cover');
  var snow_albedo = img.select('Snow_Albedo_Daily_Tile');
  
  // Masques avec fonction qualité améliorée - utilise configuration QA standard pour exports
  var good_quality_mask = createStandardQualityMask(img);
  var high_ndsi_mask = snow_cover.gte(NDSI_SNOW_THRESHOLD); // NDSI index ≥ threshold
  var high_glacier_fraction_mask = STATIC_GLACIER_FRACTION.gte(GLACIER_FRACTION_THRESHOLD / 100);
  var valid_albedo_mask = snow_albedo.lte(100);
  var combined_mask = good_quality_mask
    .and(high_ndsi_mask)
    .and(high_glacier_fraction_mask)
    .and(valid_albedo_mask);
  
  // Albédo filtré avec nom cohérent
  var albedo_scaled = snow_albedo.divide(100).updateMask(combined_mask).rename('albedo');
  
  // Masques par classe de fraction
  var masks = createFractionMasks(STATIC_GLACIER_FRACTION, FRACTION_THRESHOLDS);
  
  // Calculer les statistiques pour chaque classe
  var class_results = {};
  
  FRACTION_CLASS_NAMES.forEach(function(className) {
    var classMask = masks[className];
    var validAlbedo = albedo_scaled.updateMask(classMask);
    
    var classStats = validAlbedo.reduceRegion({
      reducer: ee.Reducer.mean().combine(
        ee.Reducer.median(), '', true
      ).combine(
        ee.Reducer.count(), '', true
      ),
      geometry: glacier_geometry,
      scale: 500,
      maxPixels: 1e9,
      tileScale: 4
    });
    
    // Appliquer MIN_PIXEL_THRESHOLD validation pour chaque classe
    var class_count = classStats.get('albedo_count');
    var class_sufficient = ee.Number(class_count).gte(MIN_PIXEL_THRESHOLD);
    
    class_results[className + '_mean'] = ee.Algorithms.If(class_sufficient, classStats.get('albedo_mean'), null);
    class_results[className + '_median'] = ee.Algorithms.If(class_sufficient, classStats.get('albedo_median'), null);
    class_results[className + '_pixel_count'] = class_count;
    class_results[className + '_sufficient_pixels'] = class_sufficient;
  });
  
  // Compter pixels totaux filtrés avec gestion d'erreur
  var total_filtered = combined_mask.rename('pixel_count')
    .updateMask(STATIC_GLACIER_FRACTION.gt(0))
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: glacier_geometry,
      scale: 500,
      maxPixels: 1e9,
      tileScale: 4
    }).get('pixel_count'); // Nom correct de la bande
  
  // Validation null avec fallback
  total_filtered = ee.Algorithms.If(
    ee.Algorithms.IsEqual(total_filtered, null),
    0,
    total_filtered
  );
  
  // Métadonnées temporelles
  var year = date.get('year');
  var doy = date.getRelative('day', 'year').add(1);
  
  // Combiner toutes les statistiques avec validation MIN_PIXEL_THRESHOLD
  var sufficient_total_pixels = ee.Number(total_filtered).gte(MIN_PIXEL_THRESHOLD);
  
  var final_stats = {
    'date': date.format('YYYY-MM-dd'),
    'year': year,
    'doy': doy,
    'decimal_year': year.add(doy.divide(365.25)),
    'total_filtered_pixels': total_filtered,
    'sufficient_total_pixels': sufficient_total_pixels,
    'min_pixel_threshold': MIN_PIXEL_THRESHOLD,
    'ndsi_snow_threshold': NDSI_SNOW_THRESHOLD,
    'glacier_fraction_threshold': GLACIER_FRACTION_THRESHOLD,
    'system:time_start': date.millis()
  };
  
  // Ajouter les résultats de classe
  Object.keys(class_results).forEach(function(key) {
    final_stats[key] = class_results[key];
  });
  
  return ee.Feature(null, final_stats);
}

// ┌────────────────────────────────────────────────────────────────────────────────────────┐
// │ SECTION 5B : ANALYSE PIXEL-LEVEL POUR EXPORT DÉTAILLÉ                                │
// └────────────────────────────────────────────────────────────────────────────────────────┘

// 7b. Fonction pour analyser les données au niveau pixel individuel
function analyzePixelLevelData(img) {
  var date = img.date();
  var snow_cover = img.select('NDSI_Snow_Cover');
  var snow_albedo = img.select('Snow_Albedo_Daily_Tile');
  var algorithm_flags = img.select('NDSI_Snow_Cover_Algorithm_Flags_QA');
  
  // Créer une grille de coordonnées pour extraction pixel
  var coords = ee.Image.pixelLonLat().select(['longitude', 'latitude']);
  
  // Masque pour limiter aux pixels glacier seulement
  var glacier_mask_sample = STATIC_GLACIER_FRACTION.gt(0);
  
  // Combiner toutes les bandes nécessaires
  var combined_image = ee.Image.cat([
    coords,
    snow_cover.rename('ndsi_snow_cover'),
    snow_albedo.rename('snow_albedo_raw'),
    snow_albedo.divide(100).rename('snow_albedo_scaled'),
    STATIC_GLACIER_FRACTION.multiply(100).rename('glacier_fraction_pct'),
    img.select('NDSI_Snow_Cover_Basic_QA').rename('basic_qa'),
    algorithm_flags.rename('algorithm_flags')
  ]).updateMask(glacier_mask_sample);
  
  // Décoder les flags d'algorithme en colonnes individuelles
  var flag_bits = ee.Image.cat([
    algorithm_flags.bitwiseAnd(1).rename('flag_inland_water'),
    algorithm_flags.bitwiseAnd(2).divide(2).rename('flag_visible_fail'),
    algorithm_flags.bitwiseAnd(4).divide(4).rename('flag_ndsi_fail'),
    algorithm_flags.bitwiseAnd(8).divide(8).rename('flag_temp_height_fail'),
    algorithm_flags.bitwiseAnd(16).divide(16).rename('flag_swir_anomaly'),
    algorithm_flags.bitwiseAnd(32).divide(32).rename('flag_probably_cloudy'),
    algorithm_flags.bitwiseAnd(64).divide(64).rename('flag_probably_clear'),
    algorithm_flags.bitwiseAnd(128).divide(128).rename('flag_high_solar_zenith')
  ]);
  
  // Ajouter le test QA standard
  var passes_qa = createStandardQualityMask(img).rename('passes_standard_qa');
  
  // Déterminer la classe de fraction glacier
  var glacier_class_code = ee.Image(0)
    .where(STATIC_GLACIER_FRACTION.gte(0).and(STATIC_GLACIER_FRACTION.lt(0.25)), 1)  // 0-25%
    .where(STATIC_GLACIER_FRACTION.gte(0.25).and(STATIC_GLACIER_FRACTION.lt(0.50)), 2) // 25-50%
    .where(STATIC_GLACIER_FRACTION.gte(0.50).and(STATIC_GLACIER_FRACTION.lt(0.75)), 3) // 50-75%
    .where(STATIC_GLACIER_FRACTION.gte(0.75).and(STATIC_GLACIER_FRACTION.lt(0.90)), 4) // 75-90%
    .where(STATIC_GLACIER_FRACTION.gte(0.90), 5) // 90-100%
    .rename('glacier_class_code');
  
  // Image finale avec toutes les bandes
  var final_image = combined_image.addBands([flag_bits, passes_qa, glacier_class_code]);
  
  // Convertir en vecteurs pour export
  var pixel_vectors = final_image.sample({
    region: glacier_geometry,
    scale: 500,
    numPixels: 10000, // Limite pour éviter timeout
    tileScale: 2,
    geometries: true
  });
  
  // Ajouter les métadonnées temporelles à chaque feature
  var year = date.get('year');
  var doy = date.getRelative('day', 'year').add(1);
  var decimal_year = year.add(doy.divide(365.25));
  
  var pixel_features = pixel_vectors.map(function(feature) {
    // Récupérer les coordonnées de la géométrie
    var coords = feature.geometry().coordinates();
    var longitude = ee.List(coords).get(0);
    var latitude = ee.List(coords).get(1);
    
    // Décoder la classe glacier en texte
    var class_code = feature.get('glacier_class_code');
    var class_text = ee.Algorithms.If(ee.Number(class_code).eq(1), '0-25%',
      ee.Algorithms.If(ee.Number(class_code).eq(2), '25-50%',
        ee.Algorithms.If(ee.Number(class_code).eq(3), '50-75%',
          ee.Algorithms.If(ee.Number(class_code).eq(4), '75-90%', '90-100%'))));
    
    // Décoder basic QA en texte
    var basic_qa_val = feature.get('basic_qa');
    var qa_text = ee.Algorithms.If(ee.Number(basic_qa_val).eq(0), 'Best',
      ee.Algorithms.If(ee.Number(basic_qa_val).eq(1), 'Good',
        ee.Algorithms.If(ee.Number(basic_qa_val).eq(2), 'OK',
          ee.Algorithms.If(ee.Number(basic_qa_val).eq(3), 'Poor',
            ee.Algorithms.If(ee.Number(basic_qa_val).eq(211), 'Night', 
              ee.Algorithms.If(ee.Number(basic_qa_val).eq(239), 'Ocean', 'Unknown'))))));
    
    return feature.set({
      'date': date.format('YYYY-MM-dd'),
      'year': year,
      'doy': doy,
      'decimal_year': decimal_year,
      'longitude': longitude,
      'latitude': latitude,
      'glacier_class': class_text,
      'basic_qa_text': qa_text,
      'system:time_start': date.millis()
    }).setGeometry(null); // Enlever géométrie pour export CSV
  });
  
  return pixel_features;
}

// ┌────────────────────────────────────────────────────────────────────────────────────────┐
// │ SECTION 6 : CALCUL DES STATISTIQUES                                                   │
// └────────────────────────────────────────────────────────────────────────────────────────┘

// 8. Afficher la configuration des filtres utilisés pour les statistiques
print('');
print('╔════════════════════════════════════════════════════════════════════════════════════════╗');
print('║                    📊 FILTER CONFIGURATION FOR CONSOLE STATISTICS 📊                  ║');
print('╚════════════════════════════════════════════════════════════════════════════════════════╝');
print('');
print('🎯 BASIC QA LEVEL: Good+ (values 0-1 only)');
print('   • Excludes: Night (211), Ocean (239), Poor quality (2-3)');
print('   • Includes: Best (0) and Good (1) quality pixels only');
print('');
print('🚩 ALGORITHM FLAGS (MOD10A1 v6.1 - 8 bits):');
print('   ✅ Bit 0 - Exclude Inland Water: TRUE (exclude meltwater/lakes)');
print('   ✅ Bit 1 - Exclude Visible Screen Fail: TRUE (CRITICAL - corrupted data)');
print('   ✅ Bit 2 - Exclude NDSI Screen Fail: TRUE (CRITICAL - unreliable NDSI)');
print('   ✅ Bit 3 - Exclude Temp/Height Fail: TRUE (IMPORTANT - atypical conditions)');
print('   ✅ Bit 4 - Exclude SWIR Anomaly: TRUE (IMPORTANT - optical anomalies)');
print('   ✅ Bit 5 - Exclude Probably Cloudy: TRUE (CRITICAL - v6.1 cloud detection)');
print('   ❌ Bit 6 - Exclude Probably Clear: FALSE (keep clear sky pixels)');
print('   ✅ Bit 7 - Exclude High Solar Zenith: TRUE (IMPORTANT - poor lighting)');
print('');
print('🗺️ SPATIAL/TEMPORAL THRESHOLDS:');
print('   • 🌨️ NDSI Snow Threshold: ≥' + NDSI_SNOW_THRESHOLD + ' (index 0-100)');
print('   • 🏔️ Glacier Fraction: ≥' + GLACIER_FRACTION_THRESHOLD + '% (focus on ice-rich pixels)');
print('   • 📅 Season: ' + (USE_PEAK_MELT_ONLY ? 'July-September (peak melt)' : 'June-September (extended melt)'));
print('   • 📊 Minimum Pixels: ≥' + MIN_PIXEL_THRESHOLD + ' (statistical reliability threshold)');
print('   • ❄️ Valid Albedo: ≤100 (exclude invalid/corrupted values)');
print('');
print('💡 FILTERING IMPACT:');
print('   • Conservative approach: Prioritizes data quality over quantity');
print('   • Research-grade: Suitable for publication and trend analysis');
print('   • Consistent: Same filters applied to all years (2010-2024)');
print('   • Interactive UI: Uses different (adjustable) filters for real-time visualization');
print('');
print('═══════════════════════════════════════════════════════════════════════════════════════');

// 9. Calculer pour toutes les années
print('Computing optimized annual statistics...');
var annual_albedo_high_snow = ee.FeatureCollection(STUDY_YEARS.map(calculateAnnualAlbedoHighSnowCoverOptimized));

print('Annual statistics (optimized):', annual_albedo_high_snow);

// 10. Calculer les statistiques quotidiennes
print('Computing optimized daily statistics...');
var dailyCollection = ee.ImageCollection('MODIS/061/MOD10A1')
  .filterDate('2010-01-01', '2024-12-31')
  .filterBounds(glacier_geometry)
  .filter(ee.Filter.calendarRange(USE_PEAK_MELT_ONLY ? 7 : SUMMER_START_MONTH, SUMMER_END_MONTH, 'month'))
  .select(['NDSI_Snow_Cover', 'Snow_Albedo_Daily_Tile', 'NDSI_Snow_Cover_Basic_QA', 'NDSI_Snow_Cover_Algorithm_Flags_QA'])
  .map(function(img) { return img.clip(glacier_geometry); });

var dailyAlbedoHighSnow = dailyCollection.map(analyzeDailyAlbedoHighSnowCoverOptimized);

print('Number of days analyzed:', dailyAlbedoHighSnow.size());

// 11. Calculer les données pixel-level (dataset complet 2010-2024)
print('Computing pixel-level data for full dataset...');
// ⚠️ ATTENTION: Processing complet de toutes les dates (2010-2024)
// Cela peut générer un fichier très volumineux et prendre du temps
var pixelLevelData = dailyCollection.map(analyzePixelLevelData).flatten();

print('Number of pixel records (full dataset):', pixelLevelData.size());

// ┌────────────────────────────────────────────────────────────────────────────────────────┐
// │ SECTION 7 : INTERFACE INTERACTIVE OPTIMISÉE                                           │
// └────────────────────────────────────────────────────────────────────────────────────────┘

// 11. Interface interactive avec améliorations
print('Optimized interactive interface...');

// Variables globales pour les données de base
var currentImage = null;
var baseSnowCover = null;
var baseAlbedo = null;
var baseQuality = null;
var baseAlgorithmFlags = null;

// Créer un sélecteur de date
var dateSlider = ui.DateSlider({
  start: '2010-07-01',
  end: '2024-09-30',
  value: '2023-08-07',
  period: 1,
  style: {width: '300px'}
});

// Helper function to create uniform sliders
var createSlider = function(min, max, value, step) {
  return ui.Slider({
    min: min,
    max: max,
    value: value,
    step: step,
    style: {width: '300px'}
  });
};

// Sliders pour les filtres (using factory function)
var ndsiSlider = createSlider(0, 100, NDSI_SNOW_THRESHOLD, 5);
var glacierFractionSlider = createSlider(0, 100, GLACIER_FRACTION_THRESHOLD, 5);
var minPixelSlider = createSlider(0, 100, MIN_PIXEL_THRESHOLD, 1);

// ┌────────────────────────────────────────────────────────────────────────────────────────┐
// │ SECTION: CONTROLS QA COMPLETS (basés sur documentation officielle GEE)                │
// └────────────────────────────────────────────────────────────────────────────────────────┘

// Basic QA Level Selector
var basicQASelect = ui.Select({
  items: [
    {label: 'Best quality only (0)', value: 'best'},
    {label: 'Good quality+ (0-1)', value: 'good'},     // DEFAULT selon votre demande
    {label: 'OK quality+ (0-2)', value: 'ok'},
    {label: 'All quality levels (0-3)', value: 'all'}
  ],
  value: 'good',  // Default to 1 (good quality) as requested
  placeholder: 'Basic Quality Level',
  style: {width: '300px'},
  onChange: updateQAFiltering
});

// Algorithm Flags Checkboxes (dynamic generation from metadata)
var flagMeta = [
  {key: 'inlandWater', bit: 0, label: 'Bit 0: Inland water', def: false},
  {key: 'visibleScreenFail', bit: 1, label: 'Bit 1: Low visible screen', def: true},
  {key: 'ndsiScreenFail', bit: 2, label: 'Bit 2: Low NDSI screen', def: true},
  {key: 'tempHeightFail', bit: 3, label: 'Bit 3: Temperature/height screen', def: true},
  {key: 'swirAnomaly', bit: 4, label: 'Bit 4: Shortwave IR reflectance', def: false},
  {key: 'probablyCloudy', bit: 5, label: 'Bit 5: Probably cloudy (v6.1)', def: true},
  {key: 'probablyClear', bit: 6, label: 'Bit 6: Probably clear (v6.1)', def: false},
  {key: 'highSolarZenith', bit: 7, label: 'Bit 7: Solar zenith screen', def: true}
];

var flagCheckboxes = {};
flagMeta.forEach(function(m) {
  flagCheckboxes[m.key] = ui.Checkbox({
    label: m.label,
    value: m.def,
    onChange: updateQAFiltering,
    style: {fontSize: '11px'}
  });
});

// Dynamic labels
var dateLabel = ui.Label('Date selection and optimized filtering parameters:');
var selectedDateLabel = ui.Label('Selected date: 2020-07-15');
var ndsiLabel = ui.Label('NDSI Snow Cover threshold: ' + NDSI_SNOW_THRESHOLD + ' (index 0-100)');
var glacierFractionLabel = ui.Label('Glacier fraction threshold: ' + GLACIER_FRACTION_THRESHOLD + '%');
var minPixelLabel = ui.Label('Minimum pixels: OFF (no filter)');
var statsLabel = ui.Label('Statistics: Waiting...');
var qaBasicLabel = ui.Label('Basic quality level: Good+ (0-1)', {fontSize: '11px'});
var qaStatsLabel = ui.Label('QA Retention: Calculating...', {fontSize: '11px'});

// Reload button for filter testing
var reloadButton = ui.Button({
  label: '🔄 Reload',
  onClick: function() {
    updateFiltering();
  },
  style: {width: '100px'}
});

// Fonction pour charger les données de base
var loadBaseData = function() {
  var dateRange = dateSlider.getValue();
  var timestamp = dateRange[0];
  var js_date = new Date(timestamp);
  var selected_date = ee.Date(js_date);
  
  var year = js_date.getFullYear();
  var month = js_date.getMonth() + 1;
  var day = js_date.getDate();
  var dateString = year + '-' + 
    (month < 10 ? '0' + month : month) + '-' + 
    (day < 10 ? '0' + day : day);
  
  selectedDateLabel.setValue('Date sélectionnée: ' + dateString);
  
  // Charger l'image MOD10A1 avec clip (incluant Algorithm_Flags_QA)
  // Note: 5-day window used for data availability in case selected date has no data
  currentImage = ee.ImageCollection('MODIS/061/MOD10A1')
    .filterDate(selected_date, selected_date.advance(5, 'day'))
    .filterBounds(glacier_geometry)
    .select(['NDSI_Snow_Cover', 'Snow_Albedo_Daily_Tile', 'NDSI_Snow_Cover_Basic_QA', 'NDSI_Snow_Cover_Algorithm_Flags_QA'])
    .first()
    .clip(glacier_geometry);
  
  // Préparer les données de base
  baseSnowCover = currentImage.select('NDSI_Snow_Cover');
  baseAlbedo = currentImage.select('Snow_Albedo_Daily_Tile').divide(100);
  baseQuality = currentImage.select('NDSI_Snow_Cover_Basic_QA');
  baseAlgorithmFlags = currentImage.select('NDSI_Snow_Cover_Algorithm_Flags_QA');
  
  // Mettre à jour l'affichage
  updateFiltering();
};

// Fonction pour mettre à jour le filtrage avec palette adaptative
var updateFiltering = function() {
  if (!currentImage) return;
  
  var ndsiThreshold = ndsiSlider.getValue();
  var glacierThreshold = glacierFractionSlider.getValue();
  var minPixelThreshold = minPixelSlider.getValue();
  
  // Mettre à jour les labels
  ndsiLabel.setValue('NDSI Snow Cover threshold: ' + ndsiThreshold + ' (index 0-100)');
  glacierFractionLabel.setValue('Glacier fraction threshold: ' + glacierThreshold + '%');
  
  if (minPixelThreshold === 0) {
    minPixelLabel.setValue('Minimum pixels: OFF (no filter)');
  } else {
    minPixelLabel.setValue('Minimum pixels: ' + minPixelThreshold);
  }
  
  // Créer les masques avec qualité compréhensive
  var basicQALevel = basicQASelect ? basicQASelect.getValue() : 'good';
  var basicMask = getBasicQAMask(currentImage, basicQALevel);
  var flagMask = getAlgorithmFlagsMask(currentImage, {
    excludeInlandWater: flagCheckboxes.inlandWater.getValue(),
    excludeVisibleScreenFail: flagCheckboxes.visibleScreenFail.getValue(),
    excludeNDSIScreenFail: flagCheckboxes.ndsiScreenFail.getValue(),
    excludeTempHeightFail: flagCheckboxes.tempHeightFail.getValue(),
    excludeSWIRAnomaly: flagCheckboxes.swirAnomaly.getValue(),
    excludeProbablyCloudy: flagCheckboxes.probablyCloudy.getValue(),        // Bit 5: Cloud flags v6.1
    excludeProbablyClear: flagCheckboxes.probablyClear.getValue(),          // Bit 6: Cloud flags v6.1
    excludeHighSolarZenith: flagCheckboxes.highSolarZenith.getValue()
  });
  var good_quality = basicMask.and(flagMask);
  var high_ndsi = baseSnowCover.gte(ndsiThreshold);
  var high_glacier_fraction = STATIC_GLACIER_FRACTION.gte(glacierThreshold / 100);
  var valid_albedo = currentImage.select('Snow_Albedo_Daily_Tile').lte(100);
  
  // Albédo filtré avec renommage pour cohérence
  var filtered_albedo = baseAlbedo
    .updateMask(good_quality)
    .updateMask(high_ndsi)
    .updateMask(high_glacier_fraction)
    .updateMask(valid_albedo)
    .rename('filtered_albedo');
  
  // Calculer min/max pour palette adaptative
  var albedoRange = filtered_albedo.reduceRegion({
    reducer: ee.Reducer.minMax(),
    geometry: glacier_geometry,
    scale: 500,
    maxPixels: 1e9,
    tileScale: 2
  });
  
  // Effacer les couches précédentes (sauf masque glacier)
  var layers = Map.layers();
  while (layers.length() > 1) {
    Map.remove(layers.get(layers.length() - 1));
  }
  
  // Palette simple et distincte pour tous les layers
  var simplePalette = ['red', 'orange', 'yellow', 'green', 'cyan', 'blue'];
  
  // Ajouter la couche de fraction glacier pour l'inspecteur
  Map.addLayer(STATIC_GLACIER_FRACTION.multiply(100), 
    {min: 0, max: 100, palette: simplePalette}, 
    'Fraction glacier (%)', false);
    
  // Ajouter les couches QA pour l'inspecteur (visible dans inspector)
  Map.addLayer(baseQuality, 
    {min: 0, max: 3, palette: ['green', 'yellow', 'orange', 'red']}, 
    'Basic QA (0=Best, 1=Good, 2=OK, 3=Poor)', false);
    
  Map.addLayer(baseAlgorithmFlags, 
    {min: 0, max: 255, palette: ['black', 'blue', 'cyan', 'green', 'yellow', 'orange', 'red', 'white']}, 
    'Algorithm Flags QA (0-255)', false);
    
  // Ajout d'une couche composite QA avec cloud flags pour inspection
  var qaComposite = ee.Image([
    baseQuality.rename('Basic_QA'),
    baseAlgorithmFlags.rename('Algorithm_Flags'), 
    baseSnowCover.rename('NDSI_Snow_Cover'),
    baseAlgorithmFlags.bitwiseAnd(32).divide(32).rename('Probably_Cloudy'),
    baseAlgorithmFlags.bitwiseAnd(64).divide(64).rename('Probably_Clear')
  ]);
  
  Map.addLayer(qaComposite, {}, 'QA Composite (Click pour inspecter)', false);
  
  // Ajouter la couche NDSI Snow Cover pour l'inspecteur
  Map.addLayer(baseSnowCover, 
    {min: 0, max: 100, palette: simplePalette}, 
    'NDSI Snow Cover (0-100)', false);
  
  // Ajouter la couche d'albédo avec palette adaptative
  albedoRange.evaluate(function(range) {
    var minVal = range['filtered_albedo_min'] || 0.4;
    var maxVal = range['filtered_albedo_max'] || 0.9;
    
    Map.addLayer(filtered_albedo, 
      {min: minVal, max: maxVal, palette: simplePalette}, 
      'Filtered Albedo (NDSI>' + ndsiThreshold + ', G>' + glacierThreshold + '%)');
  }, function(error) {
    // Error handling for tile processing issues
    print('Error computing adaptive palette:', error);
    // Add layer with default palette as fallback
    Map.addLayer(filtered_albedo, 
      {min: 0.4, max: 0.9, palette: simplePalette}, 
      'Filtered Albedo (NDSI>' + ndsiThreshold + ', G>' + glacierThreshold + '%) - Default');
  });
  
  // Calculer et afficher les statistiques avec validation pixels minimum
  var dayStats = filtered_albedo.reduceRegion({
    reducer: ee.Reducer.mean().combine(ee.Reducer.count(), '', true),
    geometry: glacier_geometry,
    scale: 500,
    maxPixels: 1e9,
    tileScale: 2
  });
  
  dayStats.evaluate(function(stats) {
    var meanAlbedo = stats['filtered_albedo_mean'];
    var pixelCount = stats['filtered_albedo_count'] || 0;
    
    var statsText = 'Statistiques temps réel (optimisées):\n';
    
    // Validation pixels minimum avec gestion null
    var pixelThresholdMet = (minPixelThreshold === 0 || pixelCount >= minPixelThreshold);
    
    if (meanAlbedo !== null && pixelCount > 0 && pixelThresholdMet) {
      statsText += '• Mean albedo: ' + meanAlbedo.toFixed(3) + '\n';
      statsText += '• Qualified pixels: ' + pixelCount + '\n';
      statsText += '• NDSI ≥' + ndsiThreshold + ' AND Glacier ≥' + glacierThreshold + '%';
      if (minPixelThreshold > 0) {
        statsText += '\n• Pixel threshold (≥' + minPixelThreshold + '): ✓';
      }
    } else if (meanAlbedo !== null && pixelCount > 0 && !pixelThresholdMet) {
      statsText += '• Pixels found: ' + pixelCount + '\n';
      statsText += '• Required threshold: ≥' + minPixelThreshold + ' pixels\n';
      statsText += '• ❌ Not enough qualified pixels';
    } else {
      statsText += '• No qualified pixels (meanAlbedo=' + meanAlbedo + ')\n';
      statsText += '• Try reducing thresholds';
    }
    
    statsLabel.setValue(statsText);
  });
};

// Fonction pour mettre à jour le filtrage QA
var updateQAFiltering = function() {
  // Mettre à jour le label QA de base
  var basicQALevel = basicQASelect.getValue();
  var basicLevelText = {
    'best': 'Best only (0)',
    'good': 'Good+ (0-1)', 
    'ok': 'OK+ (0-2)',
    'all': 'All levels (0-3)'
  };
  qaBasicLabel.setValue('Niveau qualité de base: ' + basicLevelText[basicQALevel]);
  
  // Calculer statistiques de rétention QA si nous avons des données
  if (currentImage && baseQuality && baseAlgorithmFlags) {
    // Compter pixels total dans glacier
    var totalPixels = glacier_mask.selfMask().reduceRegion({
      reducer: ee.Reducer.count(),
      geometry: glacier_geometry,
      scale: 500,
      maxPixels: 1e9,
      tileScale: 2
    });
    
    // Compter pixels retenus avec QA actuel
    var combinedQAMask = createCurrentQAMask(currentImage);
    var retainedPixels = combinedQAMask.selfMask().reduceRegion({
      reducer: ee.Reducer.count(),
      geometry: glacier_geometry,
      scale: 500,
      maxPixels: 1e9,
      tileScale: 2
    });
    
    // Calculer pourcentage de rétention
    ee.Number(totalPixels.get('constant')).getInfo(function(total) {
      ee.Number(retainedPixels.get('constant')).getInfo(function(retained) {
        if (total && retained) {
          var percentage = Math.round((retained / total) * 100);
          qaStatsLabel.setValue('Rétention pixels QA: ' + retained + '/' + total + ' (' + percentage + '%)');
        } else {
          qaStatsLabel.setValue('Rétention pixels QA: Calcul...');
        }
      });
    });
  }
  
  // Déclencher la mise à jour de l'affichage principal
  updateFiltering();
};

// Callbacks pour les sliders
ndsiSlider.onChange(updateFiltering);
glacierFractionSlider.onChange(updateFiltering);
minPixelSlider.onChange(updateFiltering);

// Boutons
var loadDataButton = ui.Button({
  label: 'Load selected date',
  onClick: loadBaseData,
  style: {width: '200px'}
});

var exportParamsButton = ui.Button({
  label: 'Export optimized parameters',
  onClick: function() {
    var ndsiVal = ndsiSlider.getValue();
    var glacierVal = glacierFractionSlider.getValue();
    var pixelVal = minPixelSlider.getValue();
    print('Optimal parameters found:');
    print('• NDSI Snow Cover threshold: ' + ndsiVal + ' (index 0-100)');
    print('• Glacier fraction threshold: ' + glacierVal + '%');
    print('• Minimum pixels: ' + (pixelVal === 0 ? 'OFF (disabled)' : pixelVal));
    print('• Period: ' + (USE_PEAK_MELT_ONLY ? 'July-September (peak melt)' : 'June-September'));
    print('• Code: NDSI_SNOW_THRESHOLD = ' + ndsiVal + '; GLACIER_FRACTION_THRESHOLD = ' + glacierVal + '; MIN_PIXEL_THRESHOLD = ' + pixelVal + ';');
  },
  style: {width: '200px'}
});

// Panneau principal de contrôle (gauche) - Contrôles de base
var mainPanel = ui.Panel([
  dateLabel,
  dateSlider,
  selectedDateLabel,
  loadDataButton,
  reloadButton,
  ui.Label(''),
  ui.Label('PARAMÈTRES DE FILTRAGE OPTIMISÉS:', {fontWeight: 'bold'}),
  ndsiLabel,
  ndsiSlider,
  glacierFractionLabel,
  glacierFractionSlider,
  minPixelLabel,
  minPixelSlider,
  ui.Label(''),
  statsLabel,
  ui.Label(''),
  exportParamsButton
], ui.Panel.Layout.flow('vertical'), {
  width: '380px',
  position: 'top-left'
});

// QA Panel (right) - Quality control details  
var qaPanel = ui.Panel([
  ui.Label('QUALITY CONTROLS (QA)', {fontWeight: 'bold', color: 'blue', fontSize: '14px'}),
  ui.Label('────────────────────────────────', {color: 'blue', fontSize: '10px'}),
  ui.Label(''),
  ui.Label('Basic QA Level:', {fontWeight: 'bold', fontSize: '12px'}),
  qaBasicLabel,
  basicQASelect,
  ui.Label(''),
  ui.Label('Algorithm Flags (Valid Bits Only):', {fontSize: '12px', fontWeight: 'bold'}),
  ui.Label('Check to EXCLUDE pixels:', {fontSize: '10px', color: 'gray'}),
  flagCheckboxes.inlandWater,           // Bit 0
  flagCheckboxes.visibleScreenFail,     // Bit 1
  flagCheckboxes.ndsiScreenFail,        // Bit 2
  flagCheckboxes.tempHeightFail,        // Bit 3
  flagCheckboxes.swirAnomaly,           // Bit 4
  flagCheckboxes.probablyCloudy,        // Bit 5
  flagCheckboxes.probablyClear,         // Bit 6
  flagCheckboxes.highSolarZenith,       // Bit 7
  ui.Label(''),
  qaStatsLabel
], ui.Panel.Layout.flow('vertical'), {
  width: '350px',
  position: 'top-right'
});

Map.add(mainPanel);
Map.add(qaPanel);

// Initialisation de la carte
Map.setOptions('SATELLITE'); // Set satellite as default basemap
Map.centerObject(glacier_geometry, 12);
Map.addLayer(glacier_mask.selfMask(), {palette: ['orange'], opacity: 0.5}, 'Saskatchewan Glacier Mask');

// ┌────────────────────────────────────────────────────────────────────────────────────────┐
// │ INSPECTEUR QA INTÉGRÉ                                                                  │
// └────────────────────────────────────────────────────────────────────────────────────────┘

// Activer l'inspecteur avec valeurs QA
Map.onClick(function(coords) {
  if (!currentImage || !baseQuality || !baseAlgorithmFlags) {
    print('First click "Load selected date"');
    return;
  }
  
  var point = ee.Geometry.Point([coords.lon, coords.lat]);
  
  // Extraire toutes les valeurs aux coordonnées cliquées
  var values = currentImage.sample(point, 500).first();
  
  values.getInfo(function(result) {
    if (result && result.properties) {
      var props = result.properties;
      
      // Informations de base
      print('═══ QA INSPECTOR - Position: ' + coords.lon.toFixed(4) + ', ' + coords.lat.toFixed(4) + ' ═══');
      print('📅 Selected date: ' + selectedDateLabel.getValue().split(': ')[1]);
      
      // Valeurs des bandes principales
      print('🌨️ NDSI Snow Cover: ' + (props.NDSI_Snow_Cover || 'No data') + ' (index 0-100)');
      print('❄️ Snow Albedo: ' + (props.Snow_Albedo_Daily_Tile || 'No data') + ' (raw values 0-100)');
      
      // QA de base avec décodage
      var basicQA = props.NDSI_Snow_Cover_Basic_QA;
      var basicQAText = 'Unknown';
      if (basicQA !== undefined) {
        switch(basicQA) {
          case 0: basicQAText = 'Best quality'; break;
          case 1: basicQAText = 'Good quality'; break;
          case 2: basicQAText = 'OK quality'; break;
          case 3: basicQAText = 'Poor quality'; break;
          case 211: basicQAText = 'Night (no data)'; break;
          case 239: basicQAText = 'Ocean'; break;
          default: basicQAText = 'Unknown (' + basicQA + ')';
        }
      }
      print('🏷️ Basic QA: ' + basicQA + ' → ' + basicQAText);
      
      // Algorithm Flags avec décodage bit par bit détaillé
      var algFlags = props.NDSI_Snow_Cover_Algorithm_Flags_QA;
      if (algFlags !== undefined) {
        print('🔍 Algorithm Flags: ' + algFlags + ' (binaire: ' + padBinary(algFlags, 8) + ')');
        print('┌─ Analyse détaillée des flags ─┐');
        
        // Bit 0 - Inland Water
        var inlandWater = (algFlags & 1);
        print('│ Bit 0 - Eau continentale: ' + (inlandWater ? 'DÉTECTÉ 💧' : 'NON 🏔️'));
        if (inlandWater) print('│   Impact: Pixel sur eau, non-glaciaire');
        
        // Bit 1 - Visible Screen Fail  
        var visibleFail = (algFlags & 2);
        print('│ Bit 1 - Échec écran visible: ' + (visibleFail ? 'ÉCHEC ❌' : 'OK ✅'));
        if (visibleFail) print('│   Impact: CRITIQUE - Données visible corrompues');
        
        // Bit 2 - NDSI Screen Fail
        var ndsiFail = (algFlags & 4);
        print('│ Bit 2 - Échec écran NDSI: ' + (ndsiFail ? 'ÉCHEC ❌' : 'OK ✅'));
        if (ndsiFail) print('│   Impact: CRITIQUE - NDSI non-fiable');
        
        // Bit 3 - Temperature/Height Screen Fail
        var tempHeightFail = (algFlags & 8);
        print('│ Bit 3 - Échec temp/altitude: ' + (tempHeightFail ? 'ÉCHEC ❌' : 'OK ✅'));
        if (tempHeightFail) print('│   Impact: IMPORTANT - Conditions atypiques');
        
        // Bit 4 - SWIR Anomaly
        var swirAnomaly = (algFlags & 16);
        print('│ Bit 4 - Anomalie SWIR: ' + (swirAnomaly ? 'DÉTECTÉ ⚠️' : 'NON 📡'));
        if (swirAnomaly) print('│   Impact: OPTIONNEL - Peut affecter précision');
        
        // Bit 5 - Probably Cloudy (NOUVEAU v6.1)
        var probablyCloudy = (algFlags & 32);
        print('│ Bit 5 - Probablement nuageux: ' + (probablyCloudy ? 'OUI ☁️' : 'NON ☀️'));
        if (probablyCloudy) print('│   Impact: CRITIQUE - Cloud masking v6.1');
        
        // Bit 6 - Probably Clear (NOUVEAU v6.1)
        var probablyClear = (algFlags & 64);
        print('│ Bit 6 - Probablement clair: ' + (probablyClear ? 'OUI ☀️' : 'NON ☁️'));
        if (probablyClear) print('│   Impact: OPTIMAL - Clear sky v6.1');
        
        // Bit 7 - High Solar Zenith
        var highSolarZenith = (algFlags & 128);
        print('│ Bit 7 - Angle solaire >70°: ' + (highSolarZenith ? 'OUI ☀️' : 'NON 🌅'));
        if (highSolarZenith) print('│   Impact: IMPORTANT - Éclairage faible');
        
        print('└─────────────────────────────────┘');
        
        // Recommandations automatiques avec cloud flags v6.1
        var criticalFlags = visibleFail || ndsiFail || probablyCloudy;
        var importantFlags = tempHeightFail || highSolarZenith;
        var optionalFlags = swirAnomaly || inlandWater;
        var excellentConditions = probablyClear && !criticalFlags && !importantFlags;
        
        if (criticalFlags) {
          print('⚠️ RECOMMANDATION: Pixel CRITIQUE - Éviter pour analyses');
          if (probablyCloudy) print('   💡 Raison: Probablement nuageux (cloud mask v6.1)');
        } else if (excellentConditions) {
          print('🌟 RECOMMANDATION: Pixel EXCELLENT - Ciel clair v6.1!');
        } else if (importantFlags) {
          print('⚡ RECOMMANDATION: Pixel ACCEPTABLE avec réserves');
        } else if (optionalFlags) {
          print('✅ RECOMMANDATION: Pixel BON avec flags mineurs');
        } else {
          print('✅ RECOMMANDATION: Pixel BON - Pas de flags critiques');
        }
      } else {
        print('🔍 Algorithm Flags: No data');
      }
      
      // Fraction glacier à ce pixel
      var glacierFractionValue = STATIC_GLACIER_FRACTION.sample(point, 500).first();
      glacierFractionValue.getInfo(function(fracResult) {
        if (fracResult && fracResult.properties && fracResult.properties.constant !== undefined) {
          var fraction = (fracResult.properties.constant * 100).toFixed(1);
          print('🏔️ Fraction glacier: ' + fraction + '%');
          
          // État du filtrage actuel
          var basicQALevel = basicQASelect.getValue();
          var passesBasicQA = false;
          switch(basicQALevel) {
            case 'best': passesBasicQA = basicQA === 0; break;
            case 'good': passesBasicQA = basicQA <= 1; break;
            case 'ok': passesBasicQA = basicQA <= 2; break;
            case 'all': passesBasicQA = basicQA <= 3; break;
          }
          passesBasicQA = passesBasicQA && basicQA !== 211 && basicQA !== 239;
          
          var passesFlags = true;
          if (algFlags !== undefined) {
            if (flagCheckboxes.inlandWater.getValue() && (algFlags & 1)) passesFlags = false;
            if (flagCheckboxes.visibleScreenFail.getValue() && (algFlags & 2)) passesFlags = false;
            if (flagCheckboxes.ndsiScreenFail.getValue() && (algFlags & 4)) passesFlags = false;
            if (flagCheckboxes.tempHeightFail.getValue() && (algFlags & 8)) passesFlags = false;
            if (flagCheckboxes.swirAnomaly.getValue() && (algFlags & 16)) passesFlags = false;
            if (flagCheckboxes.probablyCloudy.getValue() && (algFlags & 32)) passesFlags = false;
            if (flagCheckboxes.probablyClear.getValue() && (algFlags & 64)) passesFlags = false;
            if (flagCheckboxes.highSolarZenith.getValue() && (algFlags & 128)) passesFlags = false;
          }
          
          print('✅ Passe filtres QA: ' + (passesBasicQA && passesFlags ? 'OUI' : 'NON'));
          print('  • Basic QA (' + basicQALevel + '): ' + (passesBasicQA ? 'PASS' : 'FAIL'));
          print('  • Algorithm Flags: ' + (passesFlags ? 'PASS' : 'FAIL'));
          print('═══════════════════════════════════════════════════════');
        }
      });
    } else {
      print('Aucune donnée disponible à cette position.');
    }
  });
});

// Instructions mises à jour avec QA et cloud flags v6.1
var instructionsLabel = ui.Label({
  value: 'Instructions (Cloud Detection v6.1):\n' +
         '📅 PANNEAU GAUCHE - Contrôles principaux:\n' +
         '1. Sélectionnez une date avec le calendrier\n' +
         '2. Cliquez "Charger date sélectionnée"\n' +
         '3. Ajustez les sliders de filtrage\n' +
         '\n☁️ PANNEAU DROITE - QA + Cloud Detection:\n' +
         '4. Ajustez le niveau QA (défaut: Good+)\n' +
         '5. NOUVEAU: Cloud flags v6.1 disponibles!\n' +
         '6. Observez la rétention pixels en temps réel\n' +
         '\n🎯 INSPECTEUR DOUBLE:\n' +
         '7. Console: Cliquez carte pour analyse détaillée\n' +
         '8. Inspector: Activez couches QA pour valeurs',
  style: {
    fontSize: '11px',
    color: 'gray',
    whiteSpace: 'pre'
  }
});

mainPanel.add(ui.Label(''));
mainPanel.add(instructionsLabel);

// Chargement automatique sans hack computeValue
print('Chargement automatique de la date par défaut...');
loadBaseData();

// ┌────────────────────────────────────────────────────────────────────────────────────────┐
// │ SECTION 8 : EXPORTS OPTIMISÉS                                                         │
// └────────────────────────────────────────────────────────────────────────────────────────┘

// 12. Export des statistiques annuelles
Export.table.toDrive({
  collection: annual_albedo_high_snow,
  description: 'Saskatchewan_Albedo_High_Snow_Optimized_Annual_2010_2024',
  folder: 'GEE_exports',
  fileNamePrefix: 'MOD10A1_albedo_high_snow_optimized_annual_2010_2024',
  fileFormat: 'CSV'
});

// 13. Export des statistiques quotidiennes
Export.table.toDrive({
  collection: dailyAlbedoHighSnow,
  description: 'Saskatchewan_Albedo_High_Snow_Optimized_Daily_2010_2024',
  folder: 'GEE_exports',
  fileNamePrefix: 'MOD10A1_albedo_high_snow_optimized_daily_2010_2024',
  fileFormat: 'CSV'
});

// 14. Export des données pixel-level (dataset complet 2010-2024)
Export.table.toDrive({
  collection: pixelLevelData,
  description: 'Saskatchewan_Albedo_Pixel_Level_Full_Dataset_2010_2024',
  folder: 'GEE_exports',
  fileNamePrefix: 'MOD10A1_albedo_pixel_level_full_2010_2024',
  fileFormat: 'CSV'
});

print('');
print('╔════════════════════════════════════════════════════════════════════════════════════════╗');
print('║                          📄 PIXEL-LEVEL CSV EXPORT COLUMNS 📄                         ║');
print('╚════════════════════════════════════════════════════════════════════════════════════════╝');
print('');
print('🕐 TEMPORAL INFORMATION:');
print('   • date (YYYY-MM-DD)');
print('   • year, doy (day of year), decimal_year');
print('   • system:time_start (timestamp)');
print('');
print('🌍 SPATIAL INFORMATION:');
print('   • longitude, latitude (decimal degrees)');
print('   • glacier_fraction_pct (0-100%)');
print('   • glacier_class (0-25%, 25-50%, 50-75%, 75-90%, 90-100%)');
print('');
print('❄️ SNOW/ALBEDO DATA:');
print('   • ndsi_snow_cover (0-100 index)');
print('   • snow_albedo_raw (0-100 raw values)');
print('   • snow_albedo_scaled (0-1 scaled values)');
print('');
print('🏷️ QUALITY ASSESSMENT:');
print('   • basic_qa (0=Best, 1=Good, 2=OK, 3=Poor, 211=Night, 239=Ocean)');
print('   • basic_qa_text (human readable)');
print('   • algorithm_flags (0-255 raw 8-bit value)');
print('   • passes_standard_qa (0/1 boolean)');
print('');
print('🚩 INDIVIDUAL QA FLAGS (0/1 boolean):');
print('   • flag_inland_water (Bit 0)');
print('   • flag_visible_fail (Bit 1) - CRITICAL');
print('   • flag_ndsi_fail (Bit 2) - CRITICAL');
print('   • flag_temp_height_fail (Bit 3) - IMPORTANT');
print('   • flag_swir_anomaly (Bit 4) - OPTIONAL');
print('   • flag_probably_cloudy (Bit 5) - CRITICAL v6.1');
print('   • flag_probably_clear (Bit 6) - OPTIMAL v6.1');
print('   • flag_high_solar_zenith (Bit 7) - IMPORTANT');
print('');
print('💡 USAGE NOTES:');
print('   • Sample export limited to 10 dates for testing');
print('   • Each row = one pixel observation');
print('   • Filter by passes_standard_qa=1 for research-grade data');
print('   • Use individual flags for custom quality filtering');
print('   • glacier_class helps stratify analysis by ice coverage');
print('');
print('⚠️ FULL DATASET EXPORT - IMPORTANT NOTES:');
print('   • Processing ALL observation dates from 2010-2024 (15 years)');
print('   • Expected file size: ~5-10 million rows (very large CSV)');
print('   • Processing time: 30-60 minutes depending on GEE load');
print('   • Ensure adequate storage space before export');
print('   • Consider processing subsets if file becomes too large');
print('');
print('═══════════════════════════════════════════════════════════════════════════════════════');

// Note: Export image défaillant supprimé (variables non définies corrigées)

// ┌────────────────────────────────────────────────────────────────────────────────────────┐
// │ SECTION 9 : ANALYSE COMPARATIVE AVEC CORRECTION BUGS                                  │
// └────────────────────────────────────────────────────────────────────────────────────────┘

// 14. Fonction pour comparer avec albédo non filtré (bugs corrigés)
function compareWithUnfilteredAlbedoSafe(img) {
  var date = img.date();
  var snow_cover = img.select('NDSI_Snow_Cover');
  var snow_albedo = img.select('Snow_Albedo_Daily_Tile').divide(100);
  
  // Limiter aux pixels glacier
  var glacier_pixels = STATIC_GLACIER_FRACTION.gt(0);
  
  // Masque de base avec qualité améliorée - utilise configuration QA standard
  var base_mask = createStandardQualityMask(img).and(img.select('Snow_Albedo_Daily_Tile').lte(100));
  
  // Masque avec double filtrage
  var double_filter_mask = base_mask
    .and(snow_cover.gte(NDSI_SNOW_THRESHOLD))
    .and(STATIC_GLACIER_FRACTION.gte(GLACIER_FRACTION_THRESHOLD / 100));
  
  // Albédo non filtré et filtré avec noms cohérents
  var unfiltered_albedo = snow_albedo.updateMask(base_mask).updateMask(glacier_pixels).rename('unfiltered_albedo');
  var filtered_albedo = snow_albedo.updateMask(double_filter_mask).updateMask(glacier_pixels).rename('filtered_albedo');
  
  // Statistiques avec gestion d'erreur
  var unfiltered_stats = unfiltered_albedo.reduceRegion({
    reducer: ee.Reducer.mean().combine(ee.Reducer.count(), '', true),
    geometry: glacier_geometry,
    scale: 500,
    maxPixels: 1e9,
    tileScale: 2
  });
  
  var filtered_stats = filtered_albedo.reduceRegion({
    reducer: ee.Reducer.mean().combine(ee.Reducer.count(), '', true),
    geometry: glacier_geometry,
    scale: 500,
    maxPixels: 1e9,
    tileScale: 2
  });
  
  // Récupération sécurisée des valeurs avec conversion client-side appropriée
  var filtered_mean = filtered_stats.get('filtered_albedo_mean');
  var unfiltered_mean = unfiltered_stats.get('unfiltered_albedo_mean');
  var filtered_count = filtered_stats.get('filtered_albedo_count');
  var unfiltered_count = unfiltered_stats.get('unfiltered_albedo_count');
  
  // Calcul de différence sécurisé - approche simple sans null checking
  var difference = ee.Algorithms.If(
    filtered_mean,
    ee.Algorithms.If(
      unfiltered_mean,
      ee.Number(filtered_mean).subtract(ee.Number(unfiltered_mean)),
      null
    ),
    null
  );
  
  // Calcul des métadonnées temporelles
  var year = date.get('year');
  var doy = date.getRelative('day', 'year').add(1);
  var decimal_year = year.add(doy.divide(365.25));
  
  return ee.Feature(null, {
    'system:time_start': date.millis(),
    'date': date.format('YYYY-MM-dd'),
    'year': year,
    'doy': doy,
    'decimal_year': decimal_year,
    'unfiltered_mean': unfiltered_mean,
    'unfiltered_count': unfiltered_count,
    'filtered_mean': filtered_mean,
    'filtered_count': filtered_count,
    'difference': difference,
    'has_high_snow': ee.Algorithms.If(
      ee.Algorithms.IsEqual(filtered_mean, null),
      0,
      1
    )
  });
}

// ┌────────────────────────────────────────────────────────────────────────────────────────┐
// │ SECTION: VALIDATION PLOTS (STREAMLINED)                                               │
// └────────────────────────────────────────────────────────────────────────────────────────┘

// 1. DEEP STATISTICAL ANALYSIS - Research-grade albedo trend analysis
print('');
print('╔════════════════════════════════════════════════════════════════════════════════════════╗');
print('║                    DEEP STATISTICAL ANALYSIS - GLACIER ALBEDO RESEARCH                 ║');
print('╚════════════════════════════════════════════════════════════════════════════════════════╝');

// Extract data arrays for analysis - using correct column name for highest glacier fraction
var pureIceData = annual_albedo_high_snow.filter(ee.Filter.neq('glacier_90_100pct_high_snow_mean', null));
var dataArrays = pureIceData.aggregate_array('year').zip(pureIceData.aggregate_array('glacier_90_100pct_high_snow_mean'));

dataArrays.evaluate(function(arrays) {
  if (!arrays || arrays.length < 5) {
    print('⚠️ Insufficient data for deep analysis (need ≥5 years)');
    return;
  }
  
  var years = arrays.map(function(pair) { return pair[0]; });
  var albedoValues = arrays.map(function(pair) { return pair[1]; });
  var n = years.length;
  
  print('📊 DATASET OVERVIEW:');
  print('• Analysis period: ' + years[0] + '-' + years[n-1] + ' (' + n + ' years)');
  print('• Mean albedo: ' + (albedoValues.reduce(function(a, b) { return a + b; }) / n).toFixed(4));
  print('');
  
  // 1. SEN'S SLOPE ESTIMATOR - Robust non-parametric trend
  print('📈 SEN\'S SLOPE ANALYSIS (Robust Trend Detection):');
  var slopes = [];
  for (var i = 0; i < n; i++) {
    for (var j = i + 1; j < n; j++) {
      slopes.push((albedoValues[j] - albedoValues[i]) / (years[j] - years[i]));
    }
  }
  slopes.sort(function(a, b) { return a - b; });
  var sensSlope = slopes.length % 2 === 0 ? 
    (slopes[slopes.length/2 - 1] + slopes[slopes.length/2]) / 2 : 
    slopes[Math.floor(slopes.length/2)];
  
  print('• Sen\'s slope: ' + sensSlope.toFixed(6) + ' albedo/year');
  print('• Decadal change: ' + (sensSlope * 10).toFixed(4) + ' albedo/decade');
  print('• Total change (' + (years[n-1] - years[0]) + ' years): ' + (sensSlope * (years[n-1] - years[0])).toFixed(4));
  print('');
  
  // 2. CHANGE POINT DETECTION
  print('🔍 CHANGE POINT DETECTION (Structural Breaks):');
  var changePoints = [];
  var threshold = 0.03; // 3% change threshold
  var window = 3;
  
  for (var i = window; i < n - window; i++) {
    var beforeSum = 0, afterSum = 0;
    for (var k = i - window; k < i; k++) beforeSum += albedoValues[k];
    for (var k = i; k < i + window; k++) afterSum += albedoValues[k];
    
    var before = beforeSum / window;
    var after = afterSum / window;
    var change = Math.abs(after - before);
    
    if (change > threshold) {
      changePoints.push({
        year: years[i],
        magnitude: change,
        direction: after > before ? 'increase' : 'decrease'
      });
    }
  }
  
  if (changePoints.length > 0) {
    changePoints.forEach(function(cp) {
      print('• ' + cp.year + ': ' + cp.direction + ' (Δ=' + cp.magnitude.toFixed(3) + ')');
    });
  } else {
    print('• No significant change points detected (threshold: ' + threshold + ')');
  }
  print('');
  
  // 3. VARIANCE & STABILITY ANALYSIS
  print('📊 VARIABILITY ANALYSIS:');
  var mean = albedoValues.reduce(function(a, b) { return a + b; }) / n;
  var variance = albedoValues.map(function(v) { return Math.pow(v - mean, 2); })
    .reduce(function(a, b) { return a + b; }) / (n - 1);
  var stdDev = Math.sqrt(variance);
  var cv = (stdDev / mean) * 100;
  
  print('• Standard deviation: ' + stdDev.toFixed(4));
  print('• Coefficient of variation: ' + cv.toFixed(2) + '%');
  
  // Rolling 5-year statistics
  if (n >= 5) {
    var rollingCV = [];
    for (var i = 4; i < n; i++) {
      var windowData = albedoValues.slice(i-4, i+1);
      var windowMean = windowData.reduce(function(a, b) { return a + b; }) / 5;
      var windowVar = windowData.map(function(v) { return Math.pow(v - windowMean, 2); })
        .reduce(function(a, b) { return a + b; }) / 4;
      rollingCV.push({year: years[i], cv: (Math.sqrt(windowVar) / windowMean) * 100});
    }
    
    var minCV = rollingCV.reduce(function(min, curr) { return curr.cv < min.cv ? curr : min; });
    var maxCV = rollingCV.reduce(function(max, curr) { return curr.cv > max.cv ? curr : max; });
    
    print('• Most stable period: ' + minCV.year + ' (CV=' + minCV.cv.toFixed(1) + '%)');
    print('• Most variable period: ' + maxCV.year + ' (CV=' + maxCV.cv.toFixed(1) + '%)');
  }
  print('');
  
  // 4. ANOMALY DETECTION (Z-score analysis)
  print('⚠️ ANOMALY DETECTION (|z-score| > 2.0):');
  var anomalies = albedoValues.map(function(value, i) {
    var zScore = (value - mean) / stdDev;
    return {
      year: years[i],
      albedo: value,
      zScore: zScore,
      isAnomaly: Math.abs(zScore) > 2.0
    };
  }).filter(function(item) { return item.isAnomaly; });
  
  if (anomalies.length > 0) {
    anomalies.forEach(function(anom) {
      print('• ' + anom.year + ': albedo=' + anom.albedo.toFixed(4) + 
            ', z-score=' + anom.zScore.toFixed(2) + 
            ' (' + (anom.zScore > 0 ? 'HIGH' : 'LOW') + ')');
    });
  } else {
    print('• No statistical anomalies detected (threshold: |z| > 2.0)');
  }
  print('');
  
  // 5. AUTOCORRELATION ANALYSIS
  print('🔄 TEMPORAL PERSISTENCE (Lag-1 Autocorrelation):');
  if (n >= 3) {
    var x1 = albedoValues.slice(0, n-1);
    var x2 = albedoValues.slice(1);
    var mean1 = x1.reduce(function(a, b) { return a + b; }) / x1.length;
    var mean2 = x2.reduce(function(a, b) { return a + b; }) / x2.length;
    
    var numerator = 0, denom1 = 0, denom2 = 0;
    for (var i = 0; i < x1.length; i++) {
      numerator += (x1[i] - mean1) * (x2[i] - mean2);
      denom1 += Math.pow(x1[i] - mean1, 2);
      denom2 += Math.pow(x2[i] - mean2, 2);
    }
    
    var autocorr = numerator / Math.sqrt(denom1 * denom2);
    var persistence = autocorr > 0.5 ? 'HIGH' : autocorr > 0.2 ? 'MODERATE' : 'LOW';
    
    print('• Lag-1 autocorrelation: ' + autocorr.toFixed(3));
    print('• Persistence level: ' + persistence);
    print('• Interpretation: ' + (autocorr > 0.5 ? 'Strong year-to-year memory' : 
                                 autocorr > 0.2 ? 'Moderate temporal dependence' : 
                                 'Weak temporal correlation'));
  }
  print('');
  
  // 6. CLIMATE SIGNAL ANALYSIS
  print('🌡️ CLIMATE CHANGE SIGNAL (Early vs Late Period):');
  if (n >= 10) {
    var splitPoint = Math.floor(n / 2);
    var earlyPeriod = albedoValues.slice(0, splitPoint);
    var latePeriod = albedoValues.slice(-splitPoint);
    
    var earlyMean = earlyPeriod.reduce(function(a, b) { return a + b; }) / earlyPeriod.length;
    var lateMean = latePeriod.reduce(function(a, b) { return a + b; }) / latePeriod.length;
    var periodDiff = lateMean - earlyMean;
    var relativeChange = (periodDiff / earlyMean) * 100;
    
    print('• Early period (' + years[0] + '-' + years[splitPoint-1] + ') mean: ' + earlyMean.toFixed(4));
    print('• Late period (' + years[n-splitPoint] + '-' + years[n-1] + ') mean: ' + lateMean.toFixed(4));
    print('• Period difference: ' + periodDiff.toFixed(4) + ' albedo units');
    print('• Relative change: ' + relativeChange.toFixed(2) + '%');
    print('• Climate signal: ' + (Math.abs(relativeChange) > 5 ? 'STRONG' : 
                                 Math.abs(relativeChange) > 2 ? 'MODERATE' : 'WEAK'));
  }
  
  print('');
  print('╚════════════════════════════════════════════════════════════════════════════════════════╝');
});

// 2. Annual Trend Visualization - Core scientific validation
var trendChart = ui.Chart.feature.byFeature(annual_albedo_high_snow, 'year', 'glacier_90_100pct_high_snow_mean')
  .setChartType('LineChart')
  .setOptions({
    title: 'Pure Ice Albedo Trend (90-100% glacier fraction)',
    hAxis: {title: 'Year'},
    vAxis: {title: 'Mean Albedo', viewWindow: {min: 0.2, max: 0.9}},
    trendlines: {0: {type: 'linear', color: 'red', opacity: 0.8}},
    colors: ['blue'],
    pointSize: 5,
    lineWidth: 2,
    height: 350
  });

print('');
print('=== VALIDATION VISUALIZATION ===');
print(trendChart);

// FIN DU SCRIPT OPTIMISÉ