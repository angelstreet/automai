from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from ..utils.db_utils import init_mongodb, save_test_case, get_test_case, save_tree, get_tree

app = Flask(__name__)
CORS(app)
mongo_client = init_mongodb()

@app.route('/api/testcases', methods=['GET', 'POST'])
def testcases():
    db = mongo_client['virtual_pytest']
    if request.method == 'GET':
        test_cases = list(db.test_cases.find({}, {'_id': 0}))
        return jsonify(test_cases)
    elif request.method == 'POST':
        test_case = request.json
        save_test_case(test_case, mongo_client)
        return jsonify({'status': 'success', 'test_id': test_case['test_id']})

@app.route('/api/testcases/<test_id>', methods=['GET', 'PUT', 'DELETE'])
def testcase(test_id):
    db = mongo_client['virtual_pytest']
    if request.method == 'GET':
        test_case = get_test_case(test_id, mongo_client)
        return jsonify(test_case if test_case else {})
    elif request.method == 'PUT':
        test_case = request.json
        test_case['test_id'] = test_id
        save_test_case(test_case, mongo_client)
        return jsonify({'status': 'success'})
    elif request.method == 'DELETE':
        db.test_cases.delete_one({'test_id': test_id})
        return jsonify({'status': 'success'})

@app.route('/api/trees', methods=['GET', 'POST'])
def trees():
    db = mongo_client['virtual_pytest']
    if request.method == 'GET':
        trees = list(db.trees.find({}, {'_id': 0}))
        return jsonify(trees)
    elif request.method == 'POST':
        tree = request.json
        save_tree(tree, mongo_client)
        return jsonify({'status': 'success', 'tree_id': tree['tree_id']})

@app.route('/api/trees/<tree_id>', methods=['GET', 'PUT', 'DELETE'])
def tree(tree_id):
    db = mongo_client['virtual_pytest']
    if request.method == 'GET':
        tree = get_tree(tree_id, mongo_client)
        return jsonify(tree if tree else {})
    elif request.method == 'PUT':
        tree = request.json
        tree['tree_id'] = tree_id
        save_tree(tree, mongo_client)
        return jsonify({'status': 'success'})
    elif request.method == 'DELETE':
        db.trees.delete_one({'tree_id': tree_id})
        return jsonify({'status': 'success'})

@app.route('/api/campaigns', methods=['GET', 'POST'])
def campaigns():
    db = mongo_client['virtual_pytest']
    if request.method == 'GET':
        campaigns = list(db.campaigns.find({}, {'_id': 0}))
        return jsonify(campaigns)
    elif request.method == 'POST':
        campaign = request.json
        campaign['campaign_id'] = campaign.get('campaign_id', str(uuid4()))
        db.campaigns.insert_one(campaign)
        return jsonify({'status': 'success', 'campaign_id': campaign['campaign_id']})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)