import re

RATING_MAP = {
    'One': 1, 'Two': 2, 'Three': 3, 'Four': 4, 'Five': 5,
    '1': 1, '2': 2, '3': 3, '4': 4, '5': 5
}

def clean_price(price_str):
    """Strips currency symbols and converts to float."""
    if not price_str:
        return 0.0
    match = re.search(r"[\d\.]+", price_str)
    return float(match.group()) if match else 0.0

def clean_data(raw_data):
    """Transforms raw parsed data into clean formats."""
    cleaned = []
    for item in raw_data:
        cleaned.append({
            'name': item['name'].strip(),
            'price': clean_price(item['price_raw']),
            'rating': RATING_MAP.get(item['rating_raw'], 0),
            'in_stock': 'In stock' in item['availability'],
            'image_url': item.get('image_url', ''),
            'detail_url': item.get('detail_url', '')
        })
    return cleaned
