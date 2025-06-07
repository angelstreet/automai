#!/bin/bash
source /home/sunri-pi1/myvenv/bin/activate
cd ~/automai/virtualpytest/src/web
python app.py &
npm run dev &
python app.py --host