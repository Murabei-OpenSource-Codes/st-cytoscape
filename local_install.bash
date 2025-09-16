# build frontend
cd st_cytoscape/frontend
nvm install --lts
npm run build

# install package locally
cd ../../
pip install .