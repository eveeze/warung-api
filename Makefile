
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

clean-install:
	rm -rf node_modules
	npm install


