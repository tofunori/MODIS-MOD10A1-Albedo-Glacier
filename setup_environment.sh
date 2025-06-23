#!/bin/bash

# MODIS MOD10A1 Albedo Analysis Environment Setup
# Creates a comprehensive conda environment with all required packages

echo "🏔️ Setting up MODIS MOD10A1 Albedo Analysis Environment"
echo "=================================================="

# Check if mamba is available
if ! command -v mamba &> /dev/null; then
    echo "❌ Mamba not found. Please install mamba first:"
    echo "   conda install mamba -n base -c conda-forge"
    exit 1
fi

echo "✅ Mamba found, proceeding with environment creation..."

# Create environment from YAML file
echo "📦 Creating conda environment from environment.yml..."
mamba env create -f environment.yml

# Check if environment was created successfully
if [ $? -eq 0 ]; then
    echo "✅ Environment 'modis-albedo-analysis' created successfully!"
    echo ""
    echo "🚀 To activate the environment, run:"
    echo "   conda activate modis-albedo-analysis"
    echo ""
    echo "📓 To start JupyterLab with the notebook:"
    echo "   conda activate modis-albedo-analysis"
    echo "   jupyter lab MOD10A1_albedo_analysis_geemap.ipynb"
    echo ""
    echo "🔧 Important setup steps after activation:"
    echo "   1. Authenticate Earth Engine:"
    echo "      import ee"
    echo "      ee.Authenticate()"
    echo ""
    echo "   2. Install additional packages if needed:"
    echo "      pip install pymannkendall"
    echo ""
    echo "📚 Environment includes:"
    echo "   • Python 3.10"
    echo "   • Earth Engine API & Geemap"
    echo "   • Interactive widgets (ipywidgets, ipyleaflet)"
    echo "   • Statistical analysis (scipy, pymannkendall, statsmodels)"
    echo "   • Visualization (plotly, matplotlib, seaborn)"
    echo "   • Geospatial tools (geopandas, rasterio)"
    echo "   • Jupyter ecosystem (lab, notebook, voila)"
else
    echo "❌ Environment creation failed. Please check the error messages above."
    exit 1
fi