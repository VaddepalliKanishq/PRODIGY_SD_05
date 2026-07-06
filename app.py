import os
import json
import time
import queue
from flask import Flask, Response, request, render_template, send_file, jsonify

import config
from utils.logger import logger, log_queue
from utils.helpers import setup_directories
from scraper.scraper import get_page
from scraper.parser import parse_products
from scraper.cleaner import clean_data
from scraper.validator import validate_data
from scraper.exporter import export_data

app = Flask(__name__)

# Ensure required directories exist at startup
setup_directories()

@app.route('/')
def index():
    """Serves the dashboard home page."""
    return render_template('index.html')

@app.route('/api/scrape/stream')
def scrape_stream():
    """
    Server-Sent Events (SSE) endpoint to run the scraping pipeline 
    and stream live console logs and progress status.
    """
    target_url = request.args.get('target_url', config.BASE_URL)
    try:
        max_pages = int(request.args.get('max_pages', config.MAX_PAGES))
    except ValueError:
        max_pages = config.MAX_PAGES
        
    run_validation = request.args.get('run_validation', 'true').lower() == 'true'

    def generate():
        # Clear log queue from previous executions
        while not log_queue.empty():
            try:
                log_queue.get_nowait()
            except queue.Empty:
                break

        # Yield logs helper
        def yield_new_logs():
            while not log_queue.empty():
                try:
                    msg = log_queue.get_nowait()
                    yield f"data: {json.dumps({'type': 'log', 'message': msg})}\n\n"
                except queue.Empty:
                    break

        # Trigger startup signal
        logger.info("Initializing e-commerce scraping ETL pipeline...")
        yield f"data: {json.dumps({'type': 'start', 'max_pages': max_pages})}\n\n"
        yield_new_logs()
        
        all_raw_data = []

        # 1. EXTRACT PHASE
        for page in range(1, max_pages + 1):
            url = target_url.format(page)
            logger.info(f"Extract Phase: Fetching product catalog page {page}...")
            yield_new_logs()
            
            html = get_page(url)
            yield_new_logs()
            
            if html:
                page_data = parse_products(html)
                all_raw_data.extend(page_data)
                logger.info(f"Extract Phase: Successfully extracted {len(page_data)} product rows from page {page}.")
                yield_new_logs()
            else:
                logger.error(f"Extract Phase: Failed to fetch content for page {page}.")
                yield_new_logs()

            # Broadcast progress update
            yield f"data: {json.dumps({'type': 'progress', 'page': page, 'total_pages': max_pages})}\n\n"
            yield_new_logs()
            time.sleep(0.3)

        if not all_raw_data:
            logger.error("ETL pipeline stopped: No product data retrieved.")
            yield_new_logs()
            yield f"data: {json.dumps({'type': 'error', 'message': 'No data extracted.'})}\n\n"
            return

        # 2. TRANSFORM PHASE
        logger.info("Transform Phase: Cleaning raw price values, mapping ratings, and parsing availability...")
        yield_new_logs()
        time.sleep(0.5)
        cleaned_data = clean_data(all_raw_data)

        # 3. VALIDATION PHASE
        logger.info("Validation Phase: Enforcing data integrity constraints...")
        yield_new_logs()
        time.sleep(0.5)
        validated_data = validate_data(cleaned_data, run_validation=run_validation)
        logger.info(f"Validation Phase: Kept {len(validated_data)} valid rows out of {len(cleaned_data)} extracted rows.")
        yield_new_logs()

        # 4. LOAD PHASE (EXPORT)
        logger.info("Load Phase: Saving cleaned database files and summarizing analytics...")
        yield_new_logs()
        time.sleep(0.5)
        summary_results = export_data(validated_data)
        yield_new_logs()

        logger.info("Pipeline executed successfully. Outputs are ready.")
        yield_new_logs()

        # Yield completion payload
        yield f"data: {json.dumps({'type': 'done', 'summary': summary_results})}\n\n"

    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/results')
def get_results():
    """Returns the scraped items in JSON format."""
    if os.path.exists(config.CLEAN_JSON):
        try:
            with open(config.CLEAN_JSON, 'r', encoding='utf-8') as f:
                data = json.load(f)
            return jsonify(data)
        except Exception as e:
            return jsonify({"error": f"Failed to read data file: {str(e)}"}), 500
    return jsonify([])

@app.route('/api/report')
def get_report():
    """Returns the text contents of the scraping report."""
    if os.path.exists(config.REPORT_FILE):
        try:
            with open(config.REPORT_FILE, 'r', encoding='utf-8') as f:
                content = f.read()
            return jsonify({"report": content})
        except Exception as e:
            return jsonify({"error": f"Failed to read report: {str(e)}"}), 500
    return jsonify({"report": "No report available. Run the scraper first."})

@app.route('/api/download/<file_format>')
def download_file(file_format):
    """Serves the data file for user download."""
    if file_format == 'csv':
        filepath = config.CLEAN_DATA
        mimetype = 'text/csv'
        download_name = 'products_clean.csv'
    elif file_format == 'json':
        filepath = config.CLEAN_JSON
        mimetype = 'application/json'
        download_name = 'products_clean.json'
    else:
        return jsonify({"error": "Unsupported file format. Use 'csv' or 'json'."}), 400

    if os.path.exists(filepath):
        return send_file(filepath, mimetype=mimetype, as_attachment=True, download_name=download_name)
    
    return jsonify({"error": "Scrape data not found. Please execute a scraping job first."}), 404

if __name__ == '__main__':
    # Run Flask server locally
    app.run(debug=True, host='127.0.0.1', port=5000)
