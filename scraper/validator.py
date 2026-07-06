from utils.logger import logger

def validate_data(cleaned_data, run_validation=True):
    """Filters out invalid records."""
    if not run_validation:
        return cleaned_data
        
    valid_data = []
    for item in cleaned_data:
        if not item.get('name') or item['name'].strip() == "":
            logger.warning("Dropped record: Missing name.")
            continue
        if item.get('price') is None or item['price'] <= 0:
            logger.warning(f"Dropped record: Invalid price for {item['name']}.")
            continue
        valid_data.append(item)
    return valid_data
