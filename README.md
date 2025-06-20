# MODIS MOD10A1 Glacier Albedo Analysis

A comprehensive Google Earth Engine script for analyzing glacier albedo trends using MODIS MOD10A1 snow cover data (2010-2024) with research-grade quality filtering and statistical analysis.

## 🎯 Key Features

- **Interactive GEE Interface** - Real-time parameter optimization with visual feedback
- **Comprehensive QA Filtering** - MOD10A1 v6.1 cloud detection + 8-bit algorithm flags
- **Deep Statistical Analysis** - Sen's slope, change points, anomaly detection, autocorrelation
- **Research-Grade Filtering** - Conservative approach prioritizing data quality over quantity
- **Dual Exports** - Annual statistics + daily time series with comprehensive metadata

## 🚀 Quick Start

1. **Copy** the entire script from [`MOD10A1_albedo_analysis.js`](MOD10A1_albedo_analysis.js)
2. **Paste** into [Google Earth Engine Code Editor](https://code.earthengine.google.com/)
3. **Update** the glacier asset path (line 85) to your glacier mask
4. **Run** the script - statistics appear in console, interactive interface loads automatically

## 📋 Requirements

- Google Earth Engine account
- Glacier mask asset (GeoTIFF or shapefile uploaded to GEE Assets)
- Saskatchewan Glacier example uses: `projects/tofunori/assets/Saskatchewan_glacier_2024_updated`

## 🔧 Default Configuration

- **NDSI Snow Threshold**: ≥0 (index 0-100)
- **Glacier Fraction**: ≥75% (pure glacier focus)
- **Season**: July-September (peak melt period)
- **Quality**: Good+ only (excludes poor quality, night, ocean)
- **Cloud Detection**: v6.1 enabled (excludes cloudy pixels)

## 📊 Outputs

**Annual Statistics** (2010-2024):
- Mean albedo by glacier fraction class
- Pixel counts and statistical reliability flags
- Standard deviation and quality metrics

**Daily Time Series**:
- Date, year, day-of-year, decimal year
- Mean/median albedo by fraction class
- Comprehensive metadata and QA flags

## 🔍 Quality Control

The script applies **conservative filtering** for publication-ready results:
- **Basic QA**: Excludes night (211), ocean (239), poor quality (2-3)
- **Algorithm Flags**: Excludes failed screens, cloudy conditions, anomalies
- **Spatial Filter**: Minimum glacier fraction thresholds
- **Temporal Filter**: Statistical reliability minimums (≥10 pixels)

## 📈 Scientific Methods

- **Sen's Slope Estimator** - Robust non-parametric trend detection
- **Change Point Analysis** - Structural break identification
- **Anomaly Detection** - Z-score based extreme event detection
- **Autocorrelation Assessment** - Temporal persistence analysis
- **Climate Signal Analysis** - Early vs late period comparison

## 📖 Usage Notes

- Interactive UI allows parameter testing (different from export settings)
- Console displays detailed filter configuration and statistics
- Click map pixels for detailed QA inspection
- Export tasks generate CSV files in Google Drive

## 📄 Citation

If you use this tool in research, please cite:

```
MODIS MOD10A1 Glacier Albedo Analysis Tool (2024)
GitHub: https://github.com/tofunori/MODIS-MOD10A1-Albedo-Glacier
```

## 📝 License

MIT License - Open for research and educational use.

---

🌟 **Questions?** Open an issue for support or improvements.