-- Settings audit: custom attribute "Required" field + edit support (wireframe 23)

ALTER TABLE custom_attribute_definitions ADD COLUMN IF NOT EXISTS required boolean NOT NULL DEFAULT false;
