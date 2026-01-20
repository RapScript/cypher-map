
/**
 * Represents location information parsed from a GeoJSON feature properties object.
 * Safely validates and provides typed access to location data.
 */
class LocationInfo {
    /**
     * Creates a LocationInfo instance from a GeoJSON properties object.
     * @param {Object} properties - The properties object from a GeoJSON feature
     * @throws {Error} If required properties are missing
     */
    constructor(properties) {
        if (!properties || typeof properties !== 'object') {
            throw new Error('Properties must be a valid object');
        }

        // Required properties
        this.city = this._parseString(properties.city, 'city');
        this.name = this._parseString(properties.name, 'name');
        this.url = this._parseString(properties.url, 'url');

        // Optional properties
        this.address = properties.address ? String(properties.address).trim() : '';
        this.weekdays = this._parseWeekdays(properties.weekdays);
        this.categories = this.weekdays;
    }

    /**
     * Safely parse and validate a string property.
     * @private
     * @param {*} value - The value to parse
     * @param {string} propertyName - The name of the property (for error messages)
     * @returns {string} The parsed string
     * @throws {Error} If the value is not a valid non-empty string
     */
    _parseString(value, propertyName) {
        if (typeof value !== 'string' || value.trim() === '') {
            throw new Error(`Required property '${propertyName}' must be a non-empty string`);
        }
        return value.trim();
    }

    /**
     * Safely parse weekdays array.
     * @private
     * @param {*} value - The value to parse as weekdays
     * @returns {Array<string>} Array of weekday strings, empty array if not provided
     */
    _parseWeekdays(value) {
        if (!value) {
            return [];
        }
        if (!Array.isArray(value)) {
            console.warn('Weekdays property is not an array, returning empty array');
            return [];
        }
        return value.map(day => String(day).trim());
    }

    /**
     * Get a formatted representation of the location info.
     * @returns {string} Formatted location information
     */
    toString() {
        const weekdaysStr = this.weekdays.length > 0 ? ` (${this.weekdays.join(', ')})` : '';
        return `${this.name} in ${this.city}${weekdaysStr}`;
    }
}
