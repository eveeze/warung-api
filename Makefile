
# Use PowerShell for Windows
SHELL := powershell.exe
.SHELLFLAGS := -Command

# Variables
PORT ?= 3000
SERVER_FILE := src/app.js
API_BASE_URL := http://localhost:$(PORT)/api

# Start the server
start:
	node $(SERVER_FILE)

# Install dependencies
install:
	npm install
# category 
getCategory:
	http GET $(API_BASE_URL)/category

getCategoryById :
	http GET $(API_BASE_URL)/category/$(id)

createCategory : 
	http -f POST $(API_BASE_URL)/category name="$(name)" description="$(description)" image@$(image)


updateCategory:
	http -f PUT $(API_BASE_URL)/category/$(id) $(if $(name),name="$(name)") $(if $(description),description="$(description)") $(if $(image),image@$(image))
	
deleteCategory : 
	http DELETE $(API_BASE_URL)/category/$(id)

# product 

createProduct:
	http -f POST $(API_BASE_URL)/product/ name="$(name)" slug="$(slug)" barcode="$(barcode)" stock=$(stock) minStock=$(minStock) price=$(price) costPrice=$(costPrice) description="$(description)" category=$(category) ${image:+image@$(image)}

getProduct : 
	http GET $(API_BASE_URL)/product/ 

getProductById : 
	http GET $(API_BASE_URL)/product/$(id)

deleteProduct :
	http DELETE $(API_BASE_URL)/product/$(identifier)

updateProduct:
	http -f PUT $(API_BASE_URL)/product/$(identifier) $(if $(name),name="$(name)") $(if $(slug),slug="$(slug)") $(if $(barcode),barcode="$(barcode)") $(if $(stock),stock=$(stock)) $(if $(minStock),minStock=$(minStock)) $(if $(price),price=$(price)) $(if $(costPrice),costPrice=$(costPrice)) $(if $(description),description="$(description)") $(if $(category),category=$(category)) ${image:+image@$(image)}

# Create a product using make
create-example-product:
	http -f POST $(API_BASE_URL)/product/ name="Example Product" slug="example-product" barcode="987654321" stock=15 minStock=3 price=1200 costPrice=900 description="This is an example product" category=6 image@src/assets/product/producta.jpeg


update-product-by-id: 
	http -f PUT $(API_BASE_URL)/product/$(id) $(if $(name),name="$(name)") $(if $(stock),stock=$(stock)) $(if $(price),price=$(price)) $(if $(costPrice),costPrice=$(costPrice)) $(if $(minStock),minStock=$(minStock)) $(if $(description),description="$(description)") $(if $(category),category=$(category)) $(if $(image),image@$(image))  
update-product-by-slug: 
	http -f PUT $(API_BASE_URL)/product/$(identifier) $(if $(name),name="$(name)") $(if $(stock),stock=$(stock)) $(if $(price),price=$(price)) $(if $(costPrice),costPrice=$(costPrice)) $(if $(minStock),minStock=$(minStock)) $(if $(description),description="$(description)") $(if $(category),category=$(category)) $(if $(image),image@$(image))  
update-product-by-barcode: 
	http -f PUT $(API_BASE_URL)/product/$(identifier) $(if $(name),name="$(name)") $(if $(stock),stock=$(stock)) $(if $(price),price=$(price)) $(if $(costPrice),costPrice=$(costPrice)) $(if $(minStock),minStock=$(minStock)) $(if $(description),description="$(description)") $(if $(category),category=$(category)) $(if $(image),image@$(image))  


# Update partial fields using ID
update-product-partial-by-id:
	http -f PUT $(API_BASE_URL)/product/1 stock=100 description="Partial update using ID"

# Update partial fields using Slug
update-product-partial-by-slug:
	http -f PUT $(API_BASE_URL)/product/example-product price=3000

# Update partial fields using Barcode
update-product-partial-by-barcode:
	http -f PUT $(API_BASE_URL)/product/987654321 minStock=5

clean-install:
	rm -rf node_modules
	npm install


