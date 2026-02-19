/**
 * storage.js - Sistema de persistencia con localStorage
 * Guarda ajustes y datos de la aplicación
 */

const STORAGE_KEYS = {
    GALLERY: 'flower_garden_gallery',
    SETTINGS: 'flower_garden_settings',
    RAIN_STATE: 'flower_garden_rain',
    COLOR_SCHEME: 'flower_garden_color',
    GARDEN_STATE: 'flower_garden_state',
    INBOX: 'flower_garden_inbox'
};

export class StorageManager {
    constructor() {
        this.isAvailable = this.checkAvailability();
    }

    /**
     * Verifica si localStorage está disponible
     */
    checkAvailability() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('localStorage no disponible:', e);
            return false;
        }
    }

    /**
     * Guarda datos en localStorage
     */
    save(key, data) {
        if (!this.isAvailable) {
            console.warn('localStorage no disponible');
            return false;
        }

        try {
            const serialized = JSON.stringify(data);
            localStorage.setItem(key, serialized);
            return true;
        } catch (e) {
            console.error('Error al guardar en localStorage:', e);
            return false;
        }
    }

    /**
     * Carga datos desde localStorage
     */
    load(key, defaultValue = null) {
        if (!this.isAvailable) {
            return defaultValue;
        }

        try {
            const serialized = localStorage.getItem(key);
            if (serialized === null) {
                return defaultValue;
            }
            return JSON.parse(serialized);
        } catch (e) {
            console.error('Error al cargar desde localStorage:', e);
            return defaultValue;
        }
    }

    /**
     * Elimina un elemento de localStorage
     */
    remove(key) {
        if (!this.isAvailable) return false;
        
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Error al eliminar de localStorage:', e);
            return false;
        }
    }

    /**
     * Limpia todos los datos de la app
     */
    clearAll() {
        if (!this.isAvailable) return false;

        try {
            Object.values(STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return true;
        } catch (e) {
            console.error('Error al limpiar localStorage:', e);
            return false;
        }
    }

    // ============================================
    // MÉTODOS ESPECÍFICOS PARA LA APLICACIÓN
    // ============================================

    /**
     * Guarda la galería de imágenes
     */
    saveGallery(images) {
        // Limitar a 20 imágenes para no saturar storage
        const toSave = images.slice(0, 20);
        return this.save(STORAGE_KEYS.GALLERY, toSave);
    }

    /**
     * Carga la galería de imágenes
     */
    loadGallery() {
        return this.load(STORAGE_KEYS.GALLERY, []);
    }

    /**
     * Guarda el estado de la lluvia
     */
    saveRainState(state) {
        // state = { isActive: bool, modes: ['cute', 'core', etc] }
        return this.save(STORAGE_KEYS.RAIN_STATE, state);
    }

    /**
     * Carga el estado de la lluvia
     */
    loadRainState() {
        return this.load(STORAGE_KEYS.RAIN_STATE, {
            isActive: false,
            modes: ['cute']
        });
    }

    /**
     * Guarda el estado actual de las flores (coordenadas)
     */
    saveGardenState(flowers) {
        return this.save(STORAGE_KEYS.GARDEN_STATE, flowers);
    }

    /**
     * Carga las flores guardadas
     */
    loadGardenState() {
        return this.load(STORAGE_KEYS.GARDEN_STATE, []);
    }

    /**
     * Guarda el estado del Inbox
     */
    saveInbox(messages) {
        return this.save(STORAGE_KEYS.INBOX, messages);
    }

    /**
     * Carga el estado del Inbox
     */
    loadInbox() {
        return this.load(STORAGE_KEYS.INBOX, []);
    }

    /**
     * Guarda el esquema de color activo
     */
    saveColorScheme(colorName) {
        return this.save(STORAGE_KEYS.COLOR_SCHEME, { color: colorName });
    }

    /**
     * Carga el esquema de color
     */
    loadColorScheme() {
        const data = this.load(STORAGE_KEYS.COLOR_SCHEME, { color: 'default' });
        return data.color;
    }

    /**
     * Guarda configuración general
     */
    saveSettings(settings) {
        return this.save(STORAGE_KEYS.SETTINGS, settings);
    }

    /**
     * Carga configuración general
     */
    loadSettings() {
        return this.load(STORAGE_KEYS.SETTINGS, {
            lastVisit: null,
            flowerCount: 0,
            preferences: {}
        });
    }

    /**
     * Actualiza la última visita
     */
    updateLastVisit() {
        const settings = this.loadSettings();
        settings.lastVisit = new Date().toISOString();
        return this.saveSettings(settings);
    }

    /**
     * Obtiene el tamaño usado en localStorage (aproximado)
     */
    getStorageSize() {
        if (!this.isAvailable) return 0;

        let total = 0;
        Object.values(STORAGE_KEYS).forEach(key => {
            const item = localStorage.getItem(key);
            if (item) {
                total += item.length + key.length;
            }
        });

        // Convertir a KB
        return (total / 1024).toFixed(2);
    }

    /**
     * Exporta todos los datos como JSON
     */
    exportData() {
        if (!this.isAvailable) return null;

        const data = {};
        Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
            data[name] = this.load(key);
        });

        return {
            version: '1.0',
            exportDate: new Date().toISOString(),
            data
        };
    }

    /**
     * Importa datos desde un JSON exportado
     */
    importData(exportedData) {
        if (!this.isAvailable || !exportedData || !exportedData.data) {
            return false;
        }

        try {
            Object.entries(exportedData.data).forEach(([name, value]) => {
                const key = STORAGE_KEYS[name];
                if (key && value !== null) {
                    this.save(key, value);
                }
            });
            return true;
        } catch (e) {
            console.error('Error al importar datos:', e);
            return false;
        }
    }
}

// Exportar instancia única (singleton)
export const storage = new StorageManager();

// Exportar también las keys por si se necesitan
export { STORAGE_KEYS };