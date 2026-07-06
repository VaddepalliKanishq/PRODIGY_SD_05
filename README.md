# E-Commerce ETL Web Scraper

A robust web scraping dashboard built with a **Flask** backend and a clean frontend UI. It extracts e-commerce catalog data, runs a full Extract-Transform-Load (ETL) pipeline with integrated data validation, and serves the data in downloadable formats.

## Features
- **SSE Live Streaming**: Server-Sent Events (SSE) stream console logs and progress indicators in real-time to the web dashboard as the pipeline runs.
- **ETL Pipeline Architecture**:
  1. **Extract**: Fetches web pages asynchronously using `requests` and parses product grids using `BeautifulSoup`.
  2. **Transform**: Cleans currencies/prices, normalizes text descriptions, maps ratings to integers, and standardizes availability statuses.
  3. **Validate**: Verifies data sanity constraints (e.g., non-empty titles, valid price thresholds).
  4. **Load**: Exports clean datasets into both CSV and JSON formats, saving them in the `data/processed/` folder.
- **Interactive Dashboard**: Control maximum pages to scrape, trigger validations, inspect the scraper's run report, and download output datasets.

## Project Structure
```
Web Scraper/
│
├── app.py                  # Flask web application & SSE routing
├── config.py               # Central configurations (URLs, limits, file paths)
├── requirements.txt        # Package dependencies
├── README.md               # Project documentation (this file)
│
├── data/                   # Saved data outputs
│   ├── raw/                # Extracted raw files
│   └── processed/          # Cleaned CSV & JSON files
│
├── logs/                   # Core application logging output
├── output/                 # Generated scraping summary report files
│
├── scraper/                # Core ETL pipeline stages
│   ├── __init__.py
│   ├── cleaner.py          # Data cleansing and transformation routines
│   ├── exporter.py         # File loader/exporter for CSV & JSON
│   ├── parser.py           # BeautifulSoup elements parser
│   ├── scraper.py          # Fetch request and retry controller
│   └── validator.py        # Data type and value validators
│
├── static/                 # CSS styling & JS frontend client scripts
└── templates/              # HTML frontend layout templates
```

## Setup & Running Instructions

### 1. Prerequisites
Make sure Python 3.8+ and pip are installed.

### 2. Install Dependencies
Run the command below from the project root folder:
```bash
pip install -r requirements.txt
```

### 3. Run the Application
Execute the Flask server:
```bash
python app.py
```

By default, the server starts on:
[http://127.0.0.1:5000/](http://127.0.0.1:5000/)

### 4. Running a Scraping Job
1. Open the dashboard in your browser.
2. Choose the target URL template or page limit.
3. Click **Start Scraper** to trigger the pipeline and view logs live.
4. Download the generated CSV/JSON results once the process finishes.
