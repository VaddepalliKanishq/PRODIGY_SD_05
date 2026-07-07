import os
import pandas as pd
from utils.logger import logger
import config

def export_data(data, export_format="csv"):
    """Saves data to CSV/JSON files and generates a summary text report."""
    if not data:
        logger.warning("No data to export.")
        return
        
    df = pd.DataFrame(data)
    
    # Ensure export directories exist
    os.makedirs(os.path.dirname(config.RAW_DATA), exist_ok=True)
    os.path.dirname(config.CLEAN_DATA) and os.makedirs(os.path.dirname(config.CLEAN_DATA), exist_ok=True)
    os.path.dirname(config.CLEAN_JSON) and os.makedirs(os.path.dirname(config.CLEAN_JSON), exist_ok=True)
    os.makedirs(os.path.dirname(config.REPORT_FILE), exist_ok=True)
    
    # Save files
    df.to_csv(config.CLEAN_DATA, index=False)
    df.to_json(config.CLEAN_JSON, orient='records', indent=2)
    logger.info(f"Cleaned data successfully exported to CSV: {config.CLEAN_DATA}")
    logger.info(f"Cleaned data successfully exported to JSON: {config.CLEAN_JSON}")

    # Generate analytics summary report
    total_products = len(df)
    avg_price = df['price'].mean() if total_products > 0 else 0.0
    in_stock_count = df['in_stock'].sum() if 'in_stock' in df.columns else 0
    in_stock_pct = (in_stock_count / total_products) * 100 if total_products > 0 else 0.0

    report = (
        f"=========================================\n"
        f"        📊 E-COMMERCE SCRAPING REPORT     \n"
        f"=========================================\n"
        f"Total Products Extracted : {total_products}\n"
        f"Average Product Price    : ₹{avg_price:.2f}\n"
        f"Items in Stock           : {in_stock_count} ({in_stock_pct:.1f}%)\n"
        f"Data Export CSV Path     : {config.CLEAN_DATA}\n"
        f"Data Export JSON Path    : {config.CLEAN_JSON}\n"
        f"=========================================\n"
    )
    
    with open(config.REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write(report)
    logger.info(f"Analytics report generated successfully at: {config.REPORT_FILE}")
    
    return {
        "total_extracted": total_products,
        "average_price": avg_price,
        "in_stock_percentage": in_stock_pct,
        "report_summary": report
    }
