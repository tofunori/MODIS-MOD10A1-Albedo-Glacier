#!/bin/bash

# Activate the MODIS environment and start JupyterLab
echo "🏔️ Activating MODIS Albedo Analysis Environment..."

# Source conda
source ~/miniforge3/etc/profile.d/conda.sh

# Activate environment
conda activate modis-albedo-analysis

echo "✅ Environment activated: $(conda info --envs | grep '*')"
echo "📍 Current directory: $(pwd)"

# Check key packages
echo "🔍 Testing key packages..."
python -c "
try:
    import ee
    import geemap
    import pymannkendall as mk
    import plotly.graph_objects as go
    import pandas as pd
    import numpy as np
    import ipywidgets as widgets
    print('✅ All key packages imported successfully!')
    print(f'   📦 Earth Engine: {ee.__version__}')
    print(f'   🗺️ Geemap: {geemap.__version__}')
    print(f'   📊 Pandas: {pd.__version__}')
    print(f'   🔢 NumPy: {np.__version__}')
    print(f'   📈 Plotly: Available')
    print(f'   📊 pyMannKendall: Available')
    print(f'   🎛️ Widgets: Available')
except ImportError as e:
    print(f'❌ Import error: {e}')
"

echo ""
echo "🚀 Starting JupyterLab..."
echo "📓 Opening: MOD10A1_albedo_analysis_geemap.ipynb"
echo ""
echo "💡 If authentication is needed, run in Jupyter:"
echo "   import ee"
echo "   ee.Authenticate()"
echo ""

# Start JupyterLab
jupyter lab MOD10A1_albedo_analysis_geemap.ipynb