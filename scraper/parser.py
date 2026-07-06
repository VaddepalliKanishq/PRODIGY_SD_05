from bs4 import BeautifulSoup
from urllib.parse import urljoin

def parse_products(html, base_url="https://books.toscrape.com/catalogue/"):
    """Extracts raw product data from catalog HTML."""
    soup = BeautifulSoup(html, 'html.parser')
    products = soup.find_all('article', class_='product_pod')
    parsed_data = []

    for product in products:
        try:
            # Title
            title_el = product.h3.a
            title = title_el['title'] if title_el and title_el.has_attr('title') else "Unknown Title"
            
            # Price
            price_el = product.find('p', class_='price_color')
            price_raw = price_el.text if price_el else "£0.00"
            
            # Availability
            availability_el = product.find('p', class_='instock availability')
            availability = availability_el.text.strip() if availability_el else "Out of stock"
            
            # Rating class (e.g. ['star-rating', 'Three'])
            rating_el = product.find('p', class_=lambda x: x and x.startswith('star-rating'))
            rating_raw = rating_el['class'][1] if rating_el and len(rating_el['class']) > 1 else "Zero"
            
            # Image URL
            img_el = product.find('img', class_='thumbnail')
            img_src = img_el['src'] if img_el and img_el.has_attr('src') else ""
            # Resolve relative image link
            image_url = urljoin(base_url, img_src.replace('../', '')) if img_src else ""
            
            # Detail link
            link_el = product.h3.a
            link_src = link_el['href'] if link_el and link_el.has_attr('href') else ""
            detail_url = urljoin(base_url, link_src.replace('../', '')) if link_src else ""

            parsed_data.append({
                'name': title,
                'price_raw': price_raw,
                'rating_raw': rating_raw,
                'availability': availability,
                'image_url': image_url,
                'detail_url': detail_url
            })
        except Exception as e:
            from utils.logger import logger
            logger.warning(f"Error parsing product item: {e}")
            
    return parsed_data
