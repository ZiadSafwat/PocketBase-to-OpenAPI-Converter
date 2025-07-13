let pbVersion = 'v0.24'; // Default version
        document.addEventListener('DOMContentLoaded', function() {
            // DOM elements
            const fileInput = document.getElementById('schemaFile');
            const fileDropArea = document.getElementById('fileDropArea');
            const fileName = document.getElementById('fileName');
            const processBtn = document.getElementById('processBtn');
            const outputPreview = document.getElementById('outputPreview');
            const downloadBtn = document.getElementById('downloadBtn');
            const copyBtn = document.getElementById('copyBtn');
            const viewSwaggerBtn = document.getElementById('viewSwaggerBtn');
            const statusMessage = document.getElementById('statusMessage');
            const previewSection = document.getElementById('previewSection');
            const enableExpansion = document.getElementById('enableExpansion');
            const deepExpansion = document.getElementById('deepExpansion');
            const setDefaultExpansion = document.getElementById('setDefaultExpansion');
            const expandablePaths = document.getElementById('expandablePaths');
            const detectedRelations = document.getElementById('detectedRelations');
            const defaultExpansion = document.getElementById('defaultExpansion');
            const saveDefaultsBtn = document.getElementById('saveDefaultsBtn');
            const copySpecBtn = document.getElementById('copySpecBtn');
            const collectionManagement = document.getElementById('collectionManagement');
            const collectionsList = document.getElementById('collectionsList');
            const selectAllBtn = document.getElementById('selectAllBtn');
            const deselectAllBtn = document.getElementById('deselectAllBtn');
            const swaggerContainer = document.getElementById('swagger-ui-container');
            const closeSwaggerBtn = document.getElementById('close-swagger');
            
            // Tab handling
            const tabs = document.querySelectorAll('.tab');
            const tabContents = document.querySelectorAll('.tab-content');
            
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    // Remove active class from all tabs and contents
                    tabs.forEach(t => t.classList.remove('active'));
                    tabContents.forEach(c => c.classList.remove('active'));
                    
                    // Add active class to clicked tab and corresponding content
                    tab.classList.add('active');
                    const tabId = tab.getAttribute('data-tab') + 'Tab';
                    document.getElementById(tabId).classList.add('active');
                });
            });
            
            let openApiSpec = null;
            let schemaData = null;
            let detectedRelationsList = [];
            let defaultExpansionPaths = [];
            let collectionTitles = {};
            let collectionSelectionState = {};
            
            // Initialize from localStorage
            function initFromStorage() {
                const savedExpansion = localStorage.getItem('defaultExpansion');
                if (savedExpansion) {
                    defaultExpansion.value = savedExpansion;
                    defaultExpansionPaths = savedExpansion.split(',').map(p => p.trim());
                }
                
                const savedTitles = localStorage.getItem('collectionTitles');
                if (savedTitles) {
                    collectionTitles = JSON.parse(savedTitles);
                }
                
                const savedSelection = localStorage.getItem('collectionSelection');
                if (savedSelection) {
                    collectionSelectionState = JSON.parse(savedSelection);
                }
            }
            
            initFromStorage();
            
            // Handle file drag and drop
            fileDropArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileDropArea.style.borderColor = '#4361ee';
                fileDropArea.style.backgroundColor = '#e2e6ea';
            });
            
            fileDropArea.addEventListener('dragleave', () => {
                fileDropArea.style.borderColor = '#6c757d';
                fileDropArea.style.backgroundColor = '#e9ecef';
            });
            
            fileDropArea.addEventListener('drop', (e) => {
                e.preventDefault();
                fileDropArea.style.borderColor = '#6c757d';
                fileDropArea.style.backgroundColor = '#e9ecef';
                
                if (e.dataTransfer.files.length) {
                    fileInput.files = e.dataTransfer.files;
                    updateFileName();
                }
            });
            
            fileInput.addEventListener('change', updateFileName);
            
            function updateFileName() {
                if (fileInput.files.length) {
                    fileName.textContent = fileInput.files[0].name;
                } else {
                    fileName.textContent = 'No file selected';
                }
            }
            
            // Process button click
            processBtn.addEventListener('click', () => {
                if (!fileInput.files.length) {
                    showStatus('Please select a PocketBase schema file', 'error');
                    return;
                }
                
                const file = fileInput.files[0];
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    try {
                        schemaData = JSON.parse(e.target.result);
                        const version = document.getElementById('pbVersion').value;
                        
                        // Normalize schema based on version
                        schemaData = normalizeSchema(schemaData, version);

                      
                        
                        // Get expansion settings
                        const expansionSettings = {
                            enable: enableExpansion.checked,
                            deep: deepExpansion.checked,
                            setDefault: setDefaultExpansion.checked
                        };
                        
                        // Detect relations and expansion paths
                        detectedRelationsList = detectRelations(schemaData);
                        const expansionPaths = generateExpansionPaths(schemaData);
                        showDetectedRelations(detectedRelationsList, expansionPaths);
                        
                        // Populate collections for management
                        populateCollections(schemaData);
                        
                        // Build OpenAPI spec
                        openApiSpec = buildOpenapiSpec(schemaData, expansionSettings, expansionPaths);
                        outputPreview.value = JSON.stringify(openApiSpec, null, 2);
                        previewSection.style.display = 'block';
                        showStatus('OpenAPI specification generated successfully!', 'success');
                        
                        // Switch to preview tab
                        tabs[0].click();
                    } catch (error) {
                        showStatus(`Error processing file: ${error.message}`, 'error');
                        console.error(error);
                    }
                };
                
                reader.onerror = () => {
                    showStatus('Error reading file', 'error');
                };
                
                reader.readAsText(file);
            });
            
            // Download button
            downloadBtn.addEventListener('click', () => {
                if (!openApiSpec) {
                    showStatus('No specification to download', 'warning');
                    return;
                }
                
                const dataStr = JSON.stringify(openApiSpec, null, 2);
                const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
                
                const exportFileDefaultName = 'pocketbase-openapi.json';
                
                const linkElement = document.createElement('a');
                linkElement.setAttribute('href', dataUri);
                linkElement.setAttribute('download', exportFileDefaultName);
                linkElement.click();
                
                showStatus('OpenAPI specification downloaded!', 'success');
            });
            
            // Copy buttons
            copyBtn.addEventListener('click', () => {
                outputPreview.select();
                document.execCommand('copy');
                showStatus('OpenAPI specification copied to clipboard!', 'success');
            });
            
            copySpecBtn.addEventListener('click', () => {
                outputPreview.select();
                document.execCommand('copy');
                showStatus('Specification copied to clipboard!', 'success');
            });
            
            // Save default expansion paths
            saveDefaultsBtn.addEventListener('click', () => {
                const paths = defaultExpansion.value.split(',').map(p => p.trim()).filter(p => p);
                localStorage.setItem('defaultExpansion', paths.join(', '));
                defaultExpansionPaths = paths;
                showStatus('Default expansion paths saved!', 'success');
            });
            
            // View in Swagger UI
            viewSwaggerBtn.addEventListener('click', () => {
                if (!openApiSpec) {
                    showStatus('No specification to display', 'warning');
                    return;
                }
                
                // Clear previous Swagger UI
                document.getElementById('swagger-ui').innerHTML = '';
                
                // Show the container
                swaggerContainer.style.display = 'block';
                
                // Render Swagger UI - FIXED layout issue
                SwaggerUIBundle({
                    spec: openApiSpec,
                    dom_id: '#swagger-ui',
                    deepLinking: true,
                    presets: [
                        SwaggerUIBundle.presets.apis,
                        SwaggerUIBundle.SwaggerUIStandalonePreset
                    ],
                    plugins: [
                        SwaggerUIBundle.plugins.DownloadUrl
                    ],
                    layout: "BaseLayout" // Using BaseLayout instead of StandaloneLayout
                });
            });
            
            // Close Swagger UI
            closeSwaggerBtn.addEventListener('click', () => {
                swaggerContainer.style.display = 'none';
            });
            
            // Show status message
            function showStatus(message, type) {
                statusMessage.textContent = message;
                statusMessage.className = `status ${type}`;
                
                // Auto-hide success messages after 5 seconds
                if (type === 'success') {
                    setTimeout(() => {
                        statusMessage.style.display = 'none';
                    }, 5000);
                }
            }
            
            // Detect relations in the schema
            function detectRelations(schema) {
                const relations = [];
                
                schema.forEach(collection => {
                    collection.fields.forEach(field => {
                        if (field.type === "relation") {
                            // Find the related collection
                            const relatedCollection = schema.find(c => c.id === field.collectionId);
                            
                            if (relatedCollection) {
                                relations.push({
                                    collection: collection.name,
                                    field: field.name,
                                    relatedCollection: relatedCollection.name,
                                    maxSelect: field.maxSelect || 1
                                });
                            }
                        }
                    });
                });
                
                return relations;
            }
            
            // Generate expansion paths with nested relations
            function generateExpansionPaths(schema, maxDepth = 3) {
                const expansionPaths = {};
                
                // Create a map of collections by name
                const collectionsMap = new Map();
                schema.forEach(collection => {
                    collectionsMap.set(collection.name, collection);
                });
                
                // Recursive function to find nested relations
                function findNestedRelations(collectionName, currentPath = [], depth = 0) {
                    if (depth >= maxDepth) return [];
                    
                    const collection = collectionsMap.get(collectionName);
                    if (!collection) return [];
                    
                    const paths = [];
                    
                    collection.fields.forEach(field => {
                        if (field.type === "relation") {
                            const relatedCollection = schema.find(c => c.id === field.collectionId);
                            if (!relatedCollection) return;
                            
                            const newPath = [...currentPath, field.name];
                            const pathStr = newPath.join('.');
                            
                            // Add the current path
                            paths.push(pathStr);
                            
                            // Avoid infinite loops by checking for cycles
                            if (!currentPath.includes(relatedCollection.name)) {
                                // Find nested relations in the related collection
                                const nestedPaths = findNestedRelations(relatedCollection.name, newPath, depth + 1);
                                paths.push(...nestedPaths);
                            }
                        }
                    });
                    
                    return paths;
                }
                
                // Generate paths for each collection
                schema.forEach(collection => {
                    const paths = findNestedRelations(collection.name);
                    if (paths.length > 0) {
                        expansionPaths[collection.name] = paths;
                    }
                });
                
                return expansionPaths;
            }
            
            // Show detected relations with expansion paths
            function showDetectedRelations(relations, expansionPaths) {
                if (relations.length === 0) {
                    expandablePaths.innerHTML = '<p>No relations detected in this schema</p>';
                    detectedRelations.innerHTML = '<p>No relations detected</p>';
                    return;
                }
                
                let html = '';
                let detectedHtml = '';
                
                // Show all relations
                relations.forEach(rel => {
                    detectedHtml += `<div class="expandable-path">
                        <strong>${rel.collection}.${rel.field}</strong> → ${rel.relatedCollection}
                    </div>`;
                });
                
                // Show expansion paths per collection
                for (const [collection, paths] of Object.entries(expansionPaths)) {
                    html += `<div class="collection-item">
                        <div class="collection-name">${collection}</div>
                        <div class="collection-fields">`;
                    
                    paths.forEach(path => {
                        html += `<span class="relation-path">${path}</span>`;
                    });
                    
                    html += `</div></div>`;
                }
                
                expandablePaths.innerHTML = html;
                detectedRelations.innerHTML = detectedHtml;
            }
            
            // Populate collections for management
            function populateCollections(schema) {
                collectionsList.innerHTML = '';
                
                schema.forEach(collection => {
                    const name = collection.name;
                    const defaultTitle = `${name.charAt(0).toUpperCase() + name.slice(1)} Collection`;
                    const title = collectionTitles[name] || defaultTitle;
                    
                    // Initialize selection state if not present
                    if (collectionSelectionState[name] === undefined) {
                        collectionSelectionState[name] = true;
                    }
                    const isChecked = collectionSelectionState[name];
                    
                    const collectionEl = document.createElement('div');
                    collectionEl.className = 'collection-row';
                    collectionEl.innerHTML = `
                        <div class="collection-check">
                            <input type="checkbox" id="col-${name}" class="collection-select" ${isChecked ? 'checked' : ''}>
                        </div>
                        <div class="collection-info">
                            <div class="title-display">${title}</div>
                            <div class="title-default">Collection: ${name}</div>
                            <div class="title-edit" style="display: none;">
                                <input type="text" id="edit-${name}" value="${title}" placeholder="Enter custom title">
                                <button class="btn btn-success save-title" data-collection="${name}">Save</button>
                            </div>
                        </div>
                        <div class="collection-actions">
                            <button class="collection-edit-btn edit-title" data-collection="${name}">
                                <i class="fas fa-edit"></i>
                            </button>
                        </div>
                    `;
                    
                    collectionsList.appendChild(collectionEl);
                });
                
                // Add change listeners to checkboxes
                document.querySelectorAll('.collection-select').forEach(checkbox => {
                    checkbox.addEventListener('change', function() {
                        const collectionName = this.id.replace('col-', '');
                        collectionSelectionState[collectionName] = this.checked;
                        localStorage.setItem('collectionSelection', JSON.stringify(collectionSelectionState));
                    });
                });
                
                // Show the collection management section
                collectionManagement.style.display = 'block';
                
                // Add event listeners for edit buttons
                document.querySelectorAll('.edit-title').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const collectionName = this.getAttribute('data-collection');
                        const row = this.closest('.collection-row');
                        const display = row.querySelector('.title-display');
                        const edit = row.querySelector('.title-edit');
                        
                        display.style.display = 'none';
                        edit.style.display = 'flex';
                    });
                });
                
                // Add event listeners for save buttons
                document.querySelectorAll('.save-title').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const collectionName = this.getAttribute('data-collection');
                        const row = this.closest('.collection-row');
                        const display = row.querySelector('.title-display');
                        const edit = row.querySelector('.title-edit');
                        const input = row.querySelector('input[type="text"]');
                        
                        const newTitle = input.value.trim() || `${collectionName.charAt(0).toUpperCase() + collectionName.slice(1)} Collection`;
                        display.textContent = newTitle;
                        
                        // Save the title
                        collectionTitles[collectionName] = newTitle;
                        localStorage.setItem('collectionTitles', JSON.stringify(collectionTitles));
                        
                        display.style.display = 'block';
                        edit.style.display = 'none';
                    });
                });
            }
            
            // Select all collections
            selectAllBtn.addEventListener('click', () => {
                document.querySelectorAll('.collection-select').forEach(checkbox => {
                    checkbox.checked = true;
                    const collectionName = checkbox.id.replace('col-', '');
                    collectionSelectionState[collectionName] = true;
                });
                localStorage.setItem('collectionSelection', JSON.stringify(collectionSelectionState));
            });
            
            // Deselect all collections
            deselectAllBtn.addEventListener('click', () => {
                document.querySelectorAll('.collection-select').forEach(checkbox => {
                    checkbox.checked = false;
                    const collectionName = checkbox.id.replace('col-', '');
                    collectionSelectionState[collectionName] = false;
                });
                localStorage.setItem('collectionSelection', JSON.stringify(collectionSelectionState));
            });
            
            // Get selected collections
            function getSelectedCollections() {
                const selected = [];
                for (const name in collectionSelectionState) {
                    if (collectionSelectionState[name]) {
                        selected.push(name);
                    }
                }
                return selected;
            }
            
            // Get custom title for collection
            function getCollectionTitle(collectionName) {
                return collectionTitles[collectionName] || 
                       `${collectionName.charAt(0).toUpperCase() + collectionName.slice(1)} Collection`;
            }
            
            // Core conversion functions with deep expansion support
            function mapFieldToSchema(field, expansionSettings) {
                const ftype = field.type;
                const schema = {};
                
              
                
                if (ftype === "bool") {
                    schema.type = "boolean";
                } else if (ftype === "number") {
                    schema.type = "number";
                    if (field.min !== undefined && field.min !== null) {
                        schema.minimum = field.min;
                    }
                    if (field.max !== undefined && field.max !== null) {
                        schema.maximum = field.max;
                    }
                    // Handle noDecimal for v0.22
                    if (field.options?.noDecimal) {
                        schema.type = "integer";
                    }
                } else if (ftype === "date" || ftype === "autodate") {
                    schema.type = "string";
                    schema.format = "date-time";
                } else if (ftype === "email") {
                    schema.type = "string";
                    schema.format = "email";
                } else if (ftype === "url") {
                    schema.type = "string";
                    schema.format = "uri";
                } else if (ftype === "select") {
                    const maxSelect = field.maxSelect || 1;
                    const values = field.values || [];
                    
                    if (maxSelect > 1) {
                        schema.type = "array";
                        schema.items = {type: "string", enum: values};
                        if (field.minSelect !== undefined) {
                            schema.minItems = field.minSelect;
                        }
                        if (maxSelect) {
                            schema.maxItems = maxSelect;
                        }
                    } else {
                        schema.type = "string";
                        if (values.length) {
                            schema.enum = values;
                        }
                    }
                } else if (ftype === "file") {
                    const maxSelect = field.maxSelect || 1;
                    if (maxSelect > 1) {
                        schema.type = "array";
                        schema.items = {type: "string"};
                    } else {
                        schema.type = "string";
                    }
                } else if (ftype === "relation") {
                    const maxSelect = field.maxSelect || 1;
                    
                    // Add description about expansion
                    let description = "Relation field";
                    
                    if (maxSelect > 1) {
                        schema.type = "array";
                        schema.items = {type: "string"};
                        description += ". When expanded, this becomes an array of the related records.";
                    } else {
                        schema.type = "string";
                        description += ". When expanded, this becomes the related record object.";
                    }
                    
                    if (expansionSettings.enable) {
                        description += " Use the 'expand' query parameter to expand relations.";
                    }
                    
                    schema.description = description;
                } else if (ftype === "json") {
                    schema.type = "object";
                    schema.additionalProperties = true;
                } else {  // text, password, etc.
                    schema.type = "string";
                    if (field.min !== undefined && field.min !== null && field.min > 0) {
                        schema.minLength = field.min;
                    }
                    if (field.max !== undefined && field.max !== null && field.max > 0) {
                        schema.maxLength = field.max;
                    }
                    if (field.pattern) {
                        schema.pattern = field.pattern;
                    }
                }
                
                return schema;
            }
            
            // FIXED: Corrected path definitions to include base path properly
            function buildOpenapiSpec(schema, expansionSettings, expansionPaths) {
                const openapi = {
                    openapi: "3.0.3",
                    info: {
                        title: "PocketBase API",
                        version: "1.0.0",
                        description: "API documentation generated from PocketBase schema with collection grouping"
                    },
                    servers: [
                        {
                            url: "http://localhost:8090/api",
                            description: "Local PocketBase instance"
                        }
                    ],
                    paths: {},
                    components: {
                        schemas: {},
                        securitySchemes: {
                            bearerAuth: {
                                type: "http",
                                scheme: "bearer",
                                bearerFormat: "JWT"
                            }
                        }
                    },
                    tags: []
                };
                
                // Get selected collections
                const selectedCollections = getSelectedCollections();
                
                // Create schemas for all collections
                schema.forEach(collection => {
                    const name = collection.name;
                    
                    // Skip if not selected
                    if (!selectedCollections.includes(name)) return;
                    
                    const ctype = collection.type;
                    
                    // Create schema definition
                    const schemaName = `${name}Record`;
                    const customTitle = getCollectionTitle(name);
                    
                    // Add tag for this collection
                    openapi.tags.push({
                        name: customTitle,
                        description: `Operations for ${customTitle}`
                    });
                    
                    const properties = {};
                    const required = [];
                    
                    collection.fields.forEach(field => {
                        const fieldName = field.name;
                        properties[fieldName] = mapFieldToSchema(field, expansionSettings);
                        if (field.required && fieldName !== "id") {
                            required.push(fieldName);
                        }
                    });
                    
                    // Add id field
                    properties["id"] = {
                        type: "string",
                        description: "Unique record identifier"
                    };
                    
                    // Only add required if there are required fields
                    const schemaDef = {
                        type: "object",
                        properties: properties
                    };
                    
                    if (required.length) {
                        schemaDef["required"] = required;
                    }
                    
                    openapi.components.schemas[schemaName] = schemaDef;
                    
                    // Add collection paths - FIXED: Corrected path definitions
                    const basePath = `/collections/${name}/records`;
                    
                    // List records
                    openapi.paths[basePath] = {
                        get: {
                            summary: `List ${customTitle}`,
                            tags: [customTitle],
                            parameters: [],
                            responses: {
                                "200": {
                                    description: `List of ${customTitle}`,
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object",
                                                properties: {
                                                    page: { type: "number" },
                                                    perPage: { type: "number" },
                                                    totalItems: { type: "number" },
                                                    totalPages: { type: "number" },
                                                    items: {
                                                        type: "array",
                                                        items: {"$ref": `#/components/schemas/${schemaName}`}
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    };
                    
                    // Create record
                    if (ctype !== "view") {
                        openapi.paths[basePath].post = {
                            summary: `Create ${customTitle} Record`,
                            tags: [customTitle],
                            requestBody: {
                                content: {
                                    "application/json": {
                                        schema: {"$ref": `#/components/schemas/${schemaName}`}
                                    }
                                }
                            },
                            responses: {
                                "200": {
                                    description: "Created record",
                                    content: {
                                        "application/json": {
                                            schema: {"$ref": `#/components/schemas/${schemaName}`}
                                        }
                                    }
                                }
                            }
                        };
                    }
                    
                    // Record operations
                    const recordPath = `${basePath}/{id}`;
                    openapi.paths[recordPath] = {
                        get: {
                            summary: `Get ${customTitle} by ID`,
                            tags: [customTitle],
                            parameters: [{
                                name: "id",
                                in: "path",
                                required: true,
                                schema: {type: "string"}
                            }],
                            responses: {
                                "200": {
                                    description: "Single record",
                                    content: {
                                        "application/json": {
                                            schema: {"$ref": `#/components/schemas/${schemaName}`}
                                        }
                                    }
                                }
                            }
                        }
                    };
                    
                    if (ctype !== "view") {
                        openapi.paths[recordPath].patch = {
                            summary: `Update ${customTitle} Record`,
                            tags: [customTitle],
                            parameters: [{
                                name: "id",
                                in: "path",
                                required: true,
                                schema: {type: "string"}
                            }],
                            requestBody: {
                                content: {
                                    "application/json": {
                                        schema: {"$ref": `#/components/schemas/${schemaName}`}
                                    }
                                }
                            },
                            responses: {
                                "200": {
                                    description: "Updated record",
                                    content: {
                                        "application/json": {
                                            schema: {"$ref": `#/components/schemas/${schemaName}`}
                                        }
                                    }
                                }
                            }
                        };
                        
                        openapi.paths[recordPath].delete = {
                            summary: `Delete ${customTitle} Record`,
                            tags: [customTitle],
                            parameters: [{
                                name: "id",
                                in: "path",
                                required: true,
                                schema: {type: "string"}
                            }],
                            responses: {
                                "204": {
                                    description: "Record deleted"
                                }
                            }
                        };
                    }
                    
                    // Add expand parameter if collection has relations
                    const hasRelations = collection.fields.some(f => f.type === "relation");
                    const collectionExpansionPaths = expansionPaths[name] || [];
                    
                    if (hasRelations && expansionSettings.enable) {
                        // Add expand parameter to list endpoint
                        openapi.paths[basePath].get.parameters.push({
                            name: "expand",
                            in: "query",
                            description: "Comma-separated list of relations to expand. Use dot notation for nested relations.",
                            schema: {type: "string"},
                            example: collectionExpansionPaths.join(', ')
                        });
                        
                        // Add expand parameter to single record endpoint
                        openapi.paths[recordPath].get.parameters.push({
                            name: "expand",
                            in: "query",
                            description: "Comma-separated list of relations to expand. Use dot notation for nested relations.",
                            schema: {type: "string"},
                            example: collectionExpansionPaths.join(', ')
                        });
                        
                        // Add expansion documentation
                        const expansionNote = {
                            description: "### Expansion Options\n\n" +
                                "This endpoint supports expanding relations. Use the `expand` parameter with any of the following paths:\n\n" +
                                collectionExpansionPaths.map(p => `- \`${p}\``).join('\n') +
                                "\n\nYou can also combine multiple expansions with commas (e.g., `expand=field1,field2.nested`)."
                        };
                        
                        openapi.paths[basePath].get["x-notes"] = expansionNote;
                        openapi.paths[recordPath].get["x-notes"] = expansionNote;
                    }
                    
                    // Add authentication endpoints for auth collections
                    if (ctype === "auth") {
                        const authPath = `/collections/${name}/auth-with-password`;
                        openapi.paths[authPath] = {
                            post: {
                                summary: `Authenticate ${customTitle}`,
                                tags: [customTitle],
                                requestBody: {
                                    content: {
                                        "application/json": {
                                            schema: {
                                                type: "object",
                                                properties: {
                                                    identity: {type: "string"},
                                                    password: {type: "string"}
                                                },
                                                required: ["identity", "password"]
                                            }
                                        }
                                    }
                                },
                                responses: {
                                    "200": {
                                        description: "Authentication token",
                                        content: {
                                            "application/json": {
                                                schema: {
                                                    type: "object",
                                                    properties: {
                                                        token: {type: "string"},
                                                        record: {"$ref": `#/components/schemas/${schemaName}`}
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        };
                    }
                });
                
                // Add security to protected endpoints
                for (const [path, methods] of Object.entries(openapi.paths)) {
                    for (const [method, spec] of Object.entries(methods)) {
                        if (["get", "post", "patch", "delete"].includes(method)) {
                            if (!path.includes("/auth-with-password") && !path.includes("users/auth")) {
                                if (!spec.security) {
                                    spec.security = [{"bearerAuth": []}];
                                }
                            }
                        }
                    }
                }
                
                return openapi;
            }
            
            // Example schema for demo purposes
            const exampleSchema = [
                {
                    "id": "posts",
                    "name": "posts",
                    "type": "base",
                    "fields": [
                        {
                            "name": "title",
                            "type": "text",
                            "required": true
                        },
                        {
                            "name": "content",
                            "type": "text"
                        },
                        {
                            "name": "author",
                            "type": "relation",
                            "collectionId": "users"
                        }
                    ]
                },
                {
                    "id": "users",
                    "name": "users",
                    "type": "auth",
                    "fields": [
                        {
                            "name": "name",
                            "type": "text",
                            "required": true
                        },
                        {
                            "name": "email",
                            "type": "email",
                            "required": true
                        },
                        {
                            "name": "posts",
                            "type": "relation",
                            "collectionId": "posts",
                            "maxSelect": 10
                        }
                    ]
                },
                {
                    "id": "comments",
                    "name": "comments",
                    "type": "base",
                    "fields": [
                        {
                            "name": "text",
                            "type": "text",
                            "required": true
                        },
                        {
                            "name": "post",
                            "type": "relation",
                            "collectionId": "posts"
                        },
                        {
                            "name": "user",
                            "type": "relation",
                            "collectionId": "users"
                        }
                    ]
                }
            ];
            
            // For demo purposes, populate with example schema
            setTimeout(() => {
                schemaData = exampleSchema;
                populateCollections(schemaData);
                showStatus('Example schema loaded for demonstration', 'success');
            }, 500);
        });
        document.getElementById('pbVersion').addEventListener('change', function(e) {
            pbVersion = e.target.value;
        });
        //  this function normalize different schema versions
function normalizeSchema(schema, version) {
    if (version === 'v0.22') {
        return schema.map(collection => ({
            id: collection.id,
            name: collection.name,
            type: collection.type,
            fields: collection.schema.map(field => ({
                id: field.id,
                name: field.name,
                type: field.type,
                required: field.required || false,
                maxSelect: field.options?.maxSelect || 1,
                collectionId: field.options?.collectionId,
                min: field.options?.min,
                max: field.options?.max,
                pattern: field.options?.pattern,
                values: field.options?.values,
                minSelect: field.options?.minSelect
            }))
        }));
    }
    // v0.24 needs no normalization
    return schema;
}
// Add this to your detectRelations function
function detectRelations(schema) {
    const relations = [];
    
    schema.forEach(collection => {
        collection.fields.forEach(field => {
            if (field.type === "relation") {
                // Handle v0.22's collectionId reference
                const relatedId = field.collectionId || field.options?.collectionId;
                if (!relatedId) return;
                
                const relatedCollection = schema.find(c => c.id === relatedId);
                
                if (relatedCollection) {
                    relations.push({
                        collection: collection.name,
                        field: field.name,
                        relatedCollection: relatedCollection.name,
                        maxSelect: field.maxSelect || field.options?.maxSelect || 1
                    });
                }
            }
        });
    });
    
    return relations;
}
