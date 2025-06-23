# 🏔️ MODIS MOD10A1 Albedo Analysis - Environment Setup

## 🚀 Quick Start with Mamba (Recommended)

### Method 1: Using the Setup Script (Easiest)

```bash
# Navigate to project directory
cd /home/tofunori/Projects/MODIS-MOD10A1-Albedo-Glacier

# Run the automated setup script
./setup_environment.sh
```

### Method 2: Manual Mamba Installation

```bash
# Create environment from YAML file
mamba env create -f environment.yml

# Activate the environment
conda activate modis-albedo-analysis

# Start JupyterLab
jupyter lab MOD10A1_albedo_analysis_geemap.ipynb
```

## 📦 Package Overview

### Core Geospatial Stack
- **earthengine-api**: Google Earth Engine Python API
- **geemap**: Interactive Earth Engine Python package
- **geopandas**: Geospatial data manipulation
- **rasterio**: Raster data I/O
- **pyproj**: Cartographic projections

### Statistical Analysis
- **pymannkendall**: Mann-Kendall trend tests (11 different variants)
- **scipy**: Scientific computing library
- **statsmodels**: Statistical modeling
- **ruptures**: Advanced change point detection
- **arch**: ARCH/GARCH time series models

### Interactive Components
- **ipywidgets**: Interactive Jupyter widgets
- **ipyleaflet**: Interactive maps for Jupyter
- **voila**: Deploy notebooks as web applications

### Visualization
- **plotly**: Interactive plotting (superior to GEE charts)
- **matplotlib/seaborn**: Statistical plotting
- **folium**: Interactive maps
- **bokeh**: Interactive web visualizations

## 🔧 Post-Installation Setup

### 1. Earth Engine Authentication
```python
import ee
ee.Authenticate()
ee.Initialize()
```

### 2. Test Installation
```python
# Test key packages
import geemap
import plotly.graph_objects as go
import pymannkendall as mk
import pandas as pd
import numpy as np

print("✅ All packages imported successfully!")
```

## 🐍 Alternative: pip Installation

If you prefer pip over conda/mamba:

```bash
# Create virtual environment
python -m venv modis-env
source modis-env/bin/activate  # Linux/Mac
# or: modis-env\Scripts\activate  # Windows

# Install packages
pip install -r requirements.txt
```

## 🔍 Troubleshooting

### Common Issues:

1. **Earth Engine Authentication Fails**
   ```bash
   earthengine authenticate
   ```

2. **Kernel Not Found in Jupyter**
   ```bash
   conda activate modis-albedo-analysis
   python -m ipykernel install --user --name modis-albedo-analysis
   ```

3. **Widget Extensions Not Working**
   ```bash
   jupyter labextension install @jupyter-widgets/jupyterlab-manager
   jupyter labextension install jupyter-leaflet
   ```

4. **Plotly Not Displaying**
   ```bash
   jupyter labextension install jupyterlab-plotly
   ```

## 🌟 Environment Features

### Research-Grade Capabilities:
- **11 Mann-Kendall trend tests** vs basic JavaScript statistics
- **Advanced change point detection** with multiple algorithms
- **Interactive parameter optimization** with real-time feedback
- **Professional visualization** with publication-quality plots
- **Robust QA filtering** with MOD10A1 v6.1 cloud detection

### Performance Optimizations:
- **Static glacier fraction** computation for speed
- **Efficient Earth Engine** operations with proper scaling
- **Parallel processing** capabilities with dask/joblib
- **Memory-efficient** data handling with chunking

## 📊 Usage Examples

### Basic Usage:
```python
# Load the notebook
jupyter lab MOD10A1_albedo_analysis_geemap.ipynb

# Follow the phase-by-phase structure:
# Phase 1: Environment Setup
# Phase 2: Data Loading
# Phase 3: Interactive Analysis
# Phase 4: Statistical Analysis
# Phase 5: Visualization & Export
```

### Advanced Analysis:
```python
# Example: Mann-Kendall trend analysis
import pymannkendall as mk
import pandas as pd

# Load your albedo data
data = pd.read_csv('albedo_data.csv')
result = mk.original_test(data['albedo_values'])
print(f"Trend: {result.trend}, p-value: {result.p}")
```

## 🎯 Next Steps

1. **Activate environment**: `conda activate modis-albedo-analysis`
2. **Open notebook**: `jupyter lab MOD10A1_albedo_analysis_geemap.ipynb`
3. **Authenticate Earth Engine**: Run authentication cell
4. **Start analysis**: Follow the interactive workflow

## 💡 Pro Tips

- Use **mamba** instead of conda for faster package resolution
- Enable **Jupyter extensions** for better widget support
- Consider **voila** for sharing results as web applications
- Use **black** for code formatting in development

---

**Environment Size**: ~2.5GB (comprehensive scientific Python stack)
**Python Version**: 3.10 (optimal for all dependencies)
**Platform**: Cross-platform (Linux, macOS, Windows)