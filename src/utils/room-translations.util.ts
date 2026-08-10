// src/utils/room-translations.util.ts
// ─────────────────────────────────────────────────────────────────────────────
// Traducción de campos de texto que la API siempre devuelve en español.
// Usar lang === 'en' para activar la traducción; en cualquier otro valor
// se devuelve el texto original sin cambios.
// ─────────────────────────────────────────────────────────────────────────────

/** Lookup table: etiquetas de tipo de unidad en ES → EN. */
const UNIT_TYPE_ES_TO_EN: Record<string, string> = {
    "habitación": "Room",
    "habitacion": "Room",
    "habitación privada": "Private room",
    "habitacion privada": "Private room",
    "habitación compartida": "Shared room",
    "habitacion compartida": "Shared room",
    "suite": "Suite",
    "estudio": "Studio",
    "apartamento": "Apartment",
    "apartamento entero": "Entire apartment",
    "villa": "Villa",
    "casa": "House",
    "dúplex": "Duplex",
    "duplex": "Duplex",
    "ático": "Penthouse",
    "atico": "Penthouse",
    "cabaña": "Cabin",
    "cabana": "Cabin",
    "bungalow": "Bungalow",
    "chalet": "Chalet",
    "loft": "Loft",
    "hostal": "Hostel",
    "hostel": "Hostel",
    "cabaña entera": "Entire cabin",
    "cabana entera": "Entire cabin",
    "casa entera": "Entire house",
    "villa entera": "Entire villa",
};

/** Adjetivos de tipo de cama: ES → EN. */
const BED_TYPE_MAP: Record<string, string> = {
    doble: "double",
    individual: "single",
    sencilla: "single",
    matrimonial: "queen",
    litera: "bunk",
    king: "king",
    twin: "twin",
    queen: "queen",
};

/**
 * Traduce el campo `unitTypeSummary` (p. ej. "Habitación") de ES a EN.
 * Devuelve el valor original si lang !== 'en' o si no hay entrada en el mapa.
 */
export function translateUnitTypeSummary(
    text: string | null | undefined,
    lang: string,
): string | null | undefined {
    if (!text || lang !== "en") return text;
    return UNIT_TYPE_ES_TO_EN[text.trim().toLowerCase()] ?? text;
}

/**
 * Traduce descripciones de camas/habitaciones de ES a EN con sustituciones
 * regex ordenadas. Maneja el reordenamiento de palabras:
 *   "1 cama doble"  →  "1 double bed"
 *
 * Aplicar a: bedSummary, bedroomSummary, bathroomSummary, kitchenSummary,
 *            livingRoomSummary y cualquier cadena de descripción de habitación.
 */
export function translateRoomText(
    text: string | null | undefined,
    lang: string,
): string | null | undefined {
    if (!text || lang !== "en") return text;

    let r = text;

    // 1. Frases compuestas (antes de los reemplazos individuales)
    r = r.replace(/sofá[\s-]cama/gi, "sofa bed");
    r = r.replace(/\bsala de estar\b/gi, "living room");

    // 2. "N cama(s) TYPE" → "N TYPE bed(s)" (reordenamiento)
    r = r.replace(
        /\b(\d+)\s+camas?\s+(doble|individual|sencilla|matrimonial|litera|king|queen|twin)\b/gi,
        (_, n, type) => {
            const eng = BED_TYPE_MAP[type.toLowerCase()] ?? type;
            const num = parseInt(n, 10);
            return `${n} ${eng} ${num === 1 ? "bed" : "beds"}`;
        },
    );

    // 3. Literas numeradas
    r = r.replace(/\b(\d+)\s+literas\b/gi, (_, n) => `${n} bunk beds`);
    r = r.replace(/\b(\d+)\s+litera\b/gi, (_, n) => `${n} bunk bed`);

    // 4. Camas numeradas sin tipo
    r = r.replace(/\b(\d+)\s+camas\b/gi, (_, n) => `${n} beds`);
    r = r.replace(/\b(\d+)\s+cama\b/gi, (_, n) => `${n} bed`);

    // 5. Sustantivos en plural (antes del singular)
    r = r.replace(/\bbaños\b/gi, "bathrooms");
    r = r.replace(/\bdormitorios\b/gi, "bedrooms");
    r = r.replace(/\bcocinas\b/gi, "kitchens");

    // 6. Sustantivos en singular
    r = r.replace(/\bbaño\b/gi, "bathroom");
    r = r.replace(/\bdormitorio\b/gi, "bedroom");
    r = r.replace(/\bcocina\b/gi, "kitchen");
    r = r.replace(/\bsal[oó]n\b/gi, "living room");
    r = r.replace(/\bcuarto\b/gi, "room");

    // 7. Adjetivos de tipo de cama sueltos
    r = r.replace(/\bdoble\b/gi, "double");
    r = r.replace(/\bindividual\b/gi, "single");
    r = r.replace(/\bsencilla\b/gi, "single");
    r = r.replace(/\bmatrimonial\b/gi, "queen");
    r = r.replace(/\blitera\b/gi, "bunk");

    // 8. "cama/camas" sueltos restantes
    r = r.replace(/\bcamas\b/gi, "beds");
    r = r.replace(/\bcama\b/gi, "bed");

    // 9. Misc
    r = r.replace(/\bequipada\b/gi, "equipped");
    r = r.replace(/\bequipado\b/gi, "equipped");
    r = r.replace(/\bcompleto\b/gi, "full");
    r = r.replace(/\bprivado\b/gi, "private");
    r = r.replace(/\bprivada\b/gi, "private");

    return r;
}

/**
 * Traduce `layoutSummary` del tipo "Apartamento entero • 1 baño • 30 m²"
 * a "Entire apartment • 1 bathroom • 30 m²".
 * El primer segmento usa el lookup table; el resto usa translateRoomText.
 */
export function translateLayoutSummary(
    text: string | null | undefined,
    lang: string,
): string | null | undefined {
    if (!text || lang !== "en") return text;
    const parts = text.split(" • ");
    return parts
        .map((part, index) => {
            if (index === 0) {
                return (
                    UNIT_TYPE_ES_TO_EN[part.trim().toLowerCase()] ??
                    translateRoomText(part, lang) ??
                    part
                );
            }
            return translateRoomText(part, lang) ?? part;
        })
        .join(" • ");
}

/**
 * Traduce el nombre del tipo de habitación usando la tabla de nombres
 * canónicos (ver ROOM_TYPE_NAMES_EN más abajo).
 * Normalización: minúsculas + espacios/guiones → guion bajo.
 * Devuelve el nombre original si no hay traducción.
 */
export function translateRoomTypeName(name: string, lang: string): string {
    if (!name) return name;
    const key = name
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
    if (lang === "en") return ROOM_TYPE_NAMES_EN[key] ?? name;
    return ROOM_TYPE_NAMES_ES[key] ?? name;
}

/**
 * Genera la descripción de política de cancelación en el idioma correcto
 * a partir de los datos estructurados de la API (evita depender del texto
 * crudo que viene en español).
 */
export function generatePolicyDescription(
    policy: {
        type?: string;
        freeCancellationDays?: number | null;
        description?: string | null;
    } | null | undefined,
    lang: string,
): string | null {
    if (!policy) return null;

    if (lang === "en") {
        if (policy.type === "NON_REFUNDABLE") {
            return "Non-refundable reservation. In case of cancellation or no-show, 100% of the total will be charged.";
        }
        if (typeof policy.freeCancellationDays === "number") {
            const d = policy.freeCancellationDays;
            return `Free cancellation up to ${d} day${d === 1 ? "" : "s"} before arrival. In the ${d} day${d === 1 ? "" : "s"} prior to arrival, the cost of the first night will be charged. In case of no-show, 100% of the total will be charged.`;
        }
        return policy.description ?? null;
    }

    // Español (o idioma no reconocido) → texto de la API directamente
    if (policy.type === "NON_REFUNDABLE") {
        return "Reserva no reembolsable. En caso de cancelación o no presentación, se cobrará el 100% del total.";
    }
    if (typeof policy.freeCancellationDays === "number") {
        const d = policy.freeCancellationDays;
        return `Cancelación gratuita hasta ${d} día${d === 1 ? "" : "s"} antes de la llegada. En los ${d} día${d === 1 ? "" : "s"} previos a la llegada, se cobrará el coste de la primera noche. En caso de no presentación, se cobrará el 100% del total.`;
    }
    return policy.description ?? null;
}

/**
 * Traduce el nombre de una amenity usando el key de la API.
 * Siempre usa la tabla del idioma activo cuando existe una entrada para el key,
 * de modo que no depende del idioma en el que venga el campo `name` de la API.
 *
 * @param key   - amenity.key de la API (p. ej. "free_wifi")
 * @param name  - amenity.name de la API (usado como fallback si no hay entrada)
 * @param lang  - idioma activo ('en' | 'es')
 */
export function translateAmenityName(
    key: string | null | undefined,
    name: string,
    lang: string,
): string {
    if (!key) return name;
    if (lang === "en") return AMENITY_NAMES_EN[key] ?? name;
    return AMENITY_NAMES_ES[key] ?? name;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tabla de nombres canónicos de tipos de habitación (ES/EN → EN display)
// ─────────────────────────────────────────────────────────────────────────────
const ROOM_TYPE_NAMES_EN: Record<string, string> = {
    studio: "Studio",
    studio_apartment: "Studio Apartment",
    duplex: "Duplex",
    duplex_apartment: "Duplex Apartment",
    triplex: "Triplex",
    triplex_apartment: "Triplex Apartment",
    standard_room: "Standard Room",
    single_room: "Single Room",
    double_room: "Double Room",
    twin_room: "Twin Room",
    triple_room: "Triple Room",
    quad_room: "Quad Room",
    suite: "Suite",
    junior_suite: "Junior Suite",
    executive_suite: "Executive Suite",
    presidential_suite: "Presidential Suite",
    penthouse: "Penthouse",
    penthouse_suite: "Penthouse Suite",
    family_room: "Family Room",
    deluxe_room: "Deluxe Room",
    superior_room: "Superior Room",
    economy_room: "Economy Room",
    apartment: "Apartment",
    loft: "Loft",
    loft_apartment: "Loft Apartment",
    villa: "Villa",
    bungalow: "Bungalow",
    cabin: "Cabin",
    cottage: "Cottage",
    chalet: "Chalet",
    entire_apartment: "Entire Apartment",
    entire_studio: "Entire Studio",
    entire_house: "Entire House",
    entire_villa: "Entire Villa",
    private_room: "Private Room",
    shared_room: "Shared Room",
    dormitory: "Dormitory",
    hostel_room: "Hostel Room",
    accessible_room: "Accessible Room",
    connecting_rooms: "Connecting Rooms",
    garden_room: "Garden Room",
    sea_view_room: "Sea View Room",
    mountain_view_room: "Mountain View Room",
    pool_view_room: "Pool View Room",
    city_view_room: "City View Room",
    ground_floor_room: "Ground Floor Room",
    maisonette: "Maisonette",
    studio_suite: "Studio Suite",
    one_bedroom_apartment: "One Bedroom Apartment",
    two_bedroom_apartment: "Two Bedroom Apartment",
    three_bedroom_apartment: "Three Bedroom Apartment",
    four_bedroom_apartment: "Four Bedroom Apartment",
    one_bedroom: "One Bedroom",
    two_bedrooms: "Two Bedrooms",
    three_bedrooms: "Three Bedrooms",
    four_bedrooms: "Four Bedrooms",
    // Nombres en español también mapeados
    habitacion: "Room",
    habitacion_privada: "Private Room",
    habitacion_compartida: "Shared Room",
    apartamento_estudio: "Studio Apartment",
    apartamento_entero: "Entire Apartment",
    casa_entera: "Entire House",
    villa_entera: "Entire Villa",
    cabana_entera: "Entire Cabin",
};

// ─────────────────────────────────────────────────────────────────────────────
// Tabla de nombres de tipos de habitación en español (key → ES display)
// Maneja tanto claves en español como claves en inglés normalizadas.
// ─────────────────────────────────────────────────────────────────────────────
const ROOM_TYPE_NAMES_ES: Record<string, string> = {
    studio: "Estudio",
    studio_apartment: "Apartamento Estudio",
    duplex: "Dúplex",
    duplex_apartment: "Apartamento Dúplex",
    triplex: "Tríplex",
    triplex_apartment: "Apartamento Tríplex",
    standard_room: "Habitación Estándar",
    single_room: "Habitación Individual",
    double_room: "Habitación Doble",
    twin_room: "Habitación Twin",
    triple_room: "Habitación Triple",
    quad_room: "Habitación Cuádruple",
    suite: "Suite",
    junior_suite: "Junior Suite",
    executive_suite: "Suite Ejecutiva",
    presidential_suite: "Suite Presidencial",
    penthouse: "Ático",
    penthouse_suite: "Suite Ático",
    family_room: "Habitación Familiar",
    deluxe_room: "Habitación Deluxe",
    superior_room: "Habitación Superior",
    economy_room: "Habitación Económica",
    apartment: "Apartamento",
    loft: "Loft",
    loft_apartment: "Apartamento Loft",
    villa: "Villa",
    bungalow: "Bungalow",
    cabin: "Cabaña",
    cottage: "Casa Rural",
    chalet: "Chalet",
    entire_apartment: "Apartamento Entero",
    entire_studio: "Estudio Entero",
    entire_house: "Casa Entera",
    entire_villa: "Villa Entera",
    private_room: "Habitación Privada",
    shared_room: "Habitación Compartida",
    dormitory: "Dormitorio",
    hostel_room: "Habitación de Hostal",
    accessible_room: "Habitación Accesible",
    connecting_rooms: "Habitaciones Comunicadas",
    garden_room: "Habitación con Jardín",
    sea_view_room: "Habitación con Vistas al Mar",
    mountain_view_room: "Habitación con Vistas a la Montaña",
    pool_view_room: "Habitación con Vistas a la Piscina",
    city_view_room: "Habitación con Vistas a la Ciudad",
    ground_floor_room: "Habitación en Planta Baja",
    maisonette: "Maisonette",
    studio_suite: "Suite Estudio",
    one_bedroom_apartment: "Apartamento 1 Dormitorio",
    two_bedroom_apartment: "Apartamento 2 Dormitorios",
    three_bedroom_apartment: "Apartamento 3 Dormitorios",
    four_bedroom_apartment: "Apartamento 4 Dormitorios",
    one_bedroom: "1 Dormitorio",
    two_bedrooms: "2 Dormitorios",
    three_bedrooms: "3 Dormitorios",
    four_bedrooms: "4 Dormitorios",
    // Claves ya normalizadas en español
    habitacion: "Habitación",
    habitacion_privada: "Habitación Privada",
    habitacion_compartida: "Habitación Compartida",
    apartamento_estudio: "Apartamento Estudio",
    apartamento_entero: "Apartamento Entero",
    casa_entera: "Casa Entera",
    villa_entera: "Villa Entera",
    cabana_entera: "Cabaña Entera",
};

// ─────────────────────────────────────────────────────────────────────────────
// Tabla completa de nombres de amenities (key → EN display)
// ─────────────────────────────────────────────────────────────────────────────
const AMENITY_NAMES_EN: Record<string, string> = {
    free_wifi: "Free WiFi",
    wifi: "Free WiFi",
    internet: "Internet",
    parking: "Parking",
    free_parking: "Free parking",
    parking_garage: "Parking garage",
    pool: "Swimming pool",
    swimming_pool: "Swimming pool",
    indoor_pool: "Indoor pool",
    outdoor_pool: "Outdoor pool",
    air_conditioning: "Air conditioning",
    air_cond: "Air conditioning",
    heating: "Heating",
    flat_screen_tv: "Flat-screen TV",
    tv: "Television",
    cable_tv: "Cable TV",
    non_smoking_rooms: "Non-smoking rooms",
    no_smoking: "Non-smoking",
    smoking_allowed: "Smoking allowed",
    double_bed: "Double bed",
    single_bed: "Single bed",
    twin_beds: "Twin beds",
    shower: "Shower",
    bathtub: "Bathtub",
    bath: "Bathroom",
    private_bathroom: "Private bathroom",
    coffee_machine: "Coffee machine",
    coffee: "Coffee",
    tea_coffee: "Tea & coffee",
    breakfast: "Breakfast included",
    restaurant: "Restaurant",
    bar: "Bar",
    kitchen: "Kitchen",
    kitchenette: "Kitchenette",
    kitchen_kitchenette: "Kitchen / Kitchenette",
    minibar: "Minibar",
    Minibar: "Minibar",
    refrigerator: "Refrigerator",
    fridge: "Fridge",
    gym: "Gym",
    fitness_center: "Fitness centre",
    fitness_centre: "Fitness centre",
    fun_fitness_centre: "Fitness centre",
    spa: "Spa",
    sauna: "Sauna",
    jacuzzi: "Jacuzzi",
    airport_shuttle: "Airport shuttle",
    shuttle: "Shuttle service",
    "24h_front_desk": "24-hour front desk",
    front_desk_24h: "24-hour front desk",
    reception: "Reception",
    concierge: "Concierge",
    room_service: "Room service",
    laundry: "Laundry",
    dry_cleaning: "Dry cleaning",
    washing_machine: "Washing machine",
    iron: "Iron",
    hair_dryer: "Hair dryer",
    hairdryer: "Hairdryer",
    balcony: "Balcony",
    terrace: "Terrace",
    garden: "Garden",
    sun_terrace: "Sun terrace",
    solarium: "Solarium",
    baby_crib: "Baby crib",
    crib: "Crib",
    baby_cot: "Baby cot",
    business_center: "Business centre",
    meeting_room: "Meeting room",
    coworking: "Coworking",
    eco: "Eco-friendly",
    green: "Sustainable",
    towels: "Towels",
    linen: "Bed linen",
    linens: "Linens",
    safe: "Safe",
    safe_in_room: "In-room safe",
    elevator: "Elevator",
    wheelchair_accessible: "Wheelchair accessible",
    pets_allowed: "Pets allowed",
    no_pets: "No pets",
    bike_rental: "Bike rental",
    luggage_storage: "Luggage storage",
    baggage_storage: "Baggage storage",
    express_check_in: "Express check-in",
    express_check_out: "Express check-out",
    express_check_in_out: "Express check-in/out",
    smoke_detector: "Smoke detector",
    fire_extinguisher: "Fire extinguisher",
    fire_extinguishers: "Fire extinguishers",
    first_aid: "First aid kit",
    security: "Security",
    cctv: "CCTV",
    cctv_common_areas: "CCTV in common areas",
    cctv_outside_property: "CCTV outside property",
    "24h_security": "24-hour security",
    security_alarm: "Security alarm",
    smoke_alarms: "Smoke alarms",
    carbon_monoxide_detector: "Carbon monoxide detector",
    carbon_monoxide_sources: "No carbon monoxide sources",
    dishwasher: "Dishwasher",
    toilet: "Toilet",
    microwave: "Microwave",
    electric_kettle: "Electric kettle",
    toilet_paper: "Toilet paper",
    tea_coffee_maker: "Tea & coffee maker",
    coffee_tea_maker: "Tea & coffee maker",
    view: "View",
    upper_floors_elevator: "Upper floors via elevator",
    guest_ids_collected_online: "Guest IDs collected online",
    check_in_kiosk_lobby: "Check-in kiosk in lobby",
    lockbox_key_at_property: "Lockbox with key at property",
    lockbox_key_near_property: "Lockbox with key near property",
    phone_unlock_room_bluetooth: "Phone unlock room (Bluetooth)",
    phone_unlock_door_internet: "Phone unlock door (Internet)",
    pin_code_unlock_door: "PIN code to unlock door",
    qr_code_scan_door: "QR code to open door",
    downloadable_check_in_app_door: "Check-in app for door",
    phone_open_lock_bluetooth: "Phone open lock (Bluetooth)",
    phone_open_lock_internet: "Phone open lock (Internet)",
    pin_code_open_lock: "PIN code to open lock",
    qr_code_scan_lock: "QR code to open lock",
    downloadable_check_in_app_lock: "Check-in app for lock",
    invoice_provided: "Invoice provided",
    private_check_in_out: "Private check-in/out",
    tour_desk: "Tour desk",
    currency_exchange: "Currency exchange",
    atm_on_site: "ATM on site",
    lockers: "Lockers",
    ironing_service: "Ironing service",
    daily_housekeeping: "Daily housekeeping",
    suit_press: "Suit press",
    pet_basket: "Pet basket",
    pet_bowls: "Pet bowls",
    key_access: "Key access",
    key_card_access: "Key card access",
    hypoallergenic_room: "Hypoallergenic room",
    smoke_free_property: "Smoke-free property",
    designated_smoking_area: "Designated smoking area",
    facilities_disabled_guests: "Facilities for disabled guests",
    soundproof_rooms: "Soundproof rooms",
    soundproof: "Soundproof",
    property_toilet_grab_rails: "Toilet with grab rails",
    property_raised_toilet: "Raised toilet",
    ground_floor_unit: "Ground floor unit",
    room_upper_floors_elevator: "Upper floors via elevator",
    room_toilet_grab_rails: "Toilet with grab rails",
    adapted_bath: "Adapted bath",
    roll_in_shower: "Roll-in shower",
    walk_in_shower: "Walk-in shower",
    room_raised_toilet: "Raised toilet",
    lowered_sink: "Lowered sink",
    emergency_cord_bathroom: "Emergency cord in bathroom",
    shower_chair: "Shower chair",
    pub_crawls: "Pub crawls",
    walking_tours: "Walking tours",
    bike_tours: "Bike tours",
    misc_heating: "Heating",
    full_bed: "Full bed",
    sofa_bed: "Sofa bed",
    queen_bed: "Queen bed",
    king_bed: "King bed",
    bunk_bed: "Bunk bed",
    entire_studio: "Entire studio",
    entire_apartment: "Entire apartment",
    private_room: "Private room",
    private_kitchen: "Private kitchen",
    kitchenware: "Kitchenware",
    stovetop: "Stovetop",
    dining_area: "Dining area",
    dining_table: "Dining table",
    free_toiletries: "Free toiletries",
    bathtub_or_shower: "Bathtub or shower",
    radio: "Radio",
    cable_channels: "Cable channels",
    socket_near_bed: "Socket near the bed",
    cleaning_products: "Cleaning products",
    tile_marble_floor: "Tile/Marble floor",
    high_chair: "High chair",
    children_high_chair: "Children's high chair",
    sitting_area: "Sitting area",
    private_entrance: "Private entrance",
    ironing_facilities: "Ironing facilities",
    wardrobe_closet: "Wardrobe or closet",
    clothes_rack: "Clothes rack",
    dryer: "Dryer",
    ground_floor: "Ground floor",
    detached: "Detached",
    semi_detached: "Semi-detached",
    private_apartment_in_building: "Private apartment in building",
    entire_unit_wheelchair_accessible: "Entire unit wheelchair accessible",
    single_room_ac: "Single-room AC for guest accommodation",
    air_purifiers: "Air purifiers",
    hand_sanitizer: "Hand sanitizer",
    hand_sanitiser: "Hand sanitiser",
    hearing_accessible: "Hearing accessible",
    towels_sheets_extra_fee: "Towels/Sheets (extra fee)",
    oven: "Oven",
    toaster: "Toaster",
    shared_bathroom: "Shared bathroom",
    bidet: "Bidet",
    bathrobe: "Bathrobe",
    slippers: "Slippers",
    fan: "Fan",
    mosquito_net: "Mosquito net",
    blackout_curtains: "Blackout curtains",
    carpeted_floor: "Carpeted floor",
    patio: "Patio",
    garden_view: "Garden view",
    sea_view: "Sea view",
    mountain_view: "Mountain view",
    city_view: "City view",
    pool_view: "Pool view",
};

// ─────────────────────────────────────────────────────────────────────────────
// Tabla completa de nombres de amenities en español (key → ES display)
// ─────────────────────────────────────────────────────────────────────────────
const AMENITY_NAMES_ES: Record<string, string> = {
    free_wifi: "WiFi gratis",
    wifi: "WiFi gratis",
    internet: "Internet",
    parking: "Aparcamiento",
    free_parking: "Aparcamiento gratis",
    parking_garage: "Garaje",
    pool: "Piscina",
    swimming_pool: "Piscina",
    indoor_pool: "Piscina cubierta",
    outdoor_pool: "Piscina exterior",
    air_conditioning: "Aire acondicionado",
    air_cond: "Aire acondicionado",
    heating: "Calefacción",
    flat_screen_tv: "TV de pantalla plana",
    tv: "Televisión",
    cable_tv: "TV por cable",
    non_smoking_rooms: "Habitaciones de no fumadores",
    no_smoking: "No fumadores",
    smoking_allowed: "Se permite fumar",
    double_bed: "Cama doble",
    single_bed: "Cama individual",
    twin_beds: "Camas gemelas",
    shower: "Ducha",
    bathtub: "Bañera",
    bath: "Baño",
    private_bathroom: "Baño privado",
    coffee_machine: "Cafetera",
    coffee: "Café",
    tea_coffee: "Té y café",
    breakfast: "Desayuno incluido",
    restaurant: "Restaurante",
    bar: "Bar",
    kitchen: "Cocina",
    kitchenette: "Kitchenette",
    kitchen_kitchenette: "Cocina / Kitchenette",
    minibar: "Minibar",
    Minibar: "Minibar",
    refrigerator: "Nevera",
    fridge: "Nevera",
    gym: "Gimnasio",
    fitness_center: "Centro de fitness",
    fitness_centre: "Centro de fitness",
    fun_fitness_centre: "Centro de fitness",
    spa: "Spa",
    sauna: "Sauna",
    jacuzzi: "Jacuzzi",
    airport_shuttle: "Transfer aeropuerto",
    shuttle: "Servicio de traslado",
    "24h_front_desk": "Recepción 24 h",
    front_desk_24h: "Recepción 24 h",
    reception: "Recepción",
    concierge: "Conserje",
    room_service: "Servicio de habitaciones",
    laundry: "Lavandería",
    dry_cleaning: "Lavado en seco",
    washing_machine: "Lavadora",
    iron: "Plancha",
    hair_dryer: "Secador de cabello",
    hairdryer: "Secador de pelo",
    balcony: "Balcón",
    terrace: "Terraza",
    garden: "Jardín",
    sun_terrace: "Terraza solarium",
    solarium: "Solario",
    baby_crib: "Cuna",
    crib: "Cuna",
    baby_cot: "Cuna",
    business_center: "Centro de negocios",
    meeting_room: "Sala de reuniones",
    coworking: "Coworking",
    eco: "Ecolodge",
    green: "Sostenible",
    towels: "Toallas",
    linen: "Ropa de cama",
    linens: "Ropa de cama",
    safe: "Caja fuerte",
    safe_in_room: "Caja fuerte en la habitación",
    elevator: "Ascensor",
    wheelchair_accessible: "Acceso para sillas de ruedas",
    pets_allowed: "Mascotas",
    no_pets: "No se admiten mascotas",
    bike_rental: "Alquiler de bicicletas",
    luggage_storage: "Consigna de equipaje",
    baggage_storage: "Consigna de equipaje",
    express_check_in: "Check-in exprés",
    express_check_out: "Check-out exprés",
    express_check_in_out: "Check-in/out exprés",
    smoke_detector: "Detector de humo",
    fire_extinguisher: "Extintor",
    fire_extinguishers: "Extintores",
    first_aid: "Botiquín",
    security: "Seguridad",
    cctv: "Videovigilancia",
    cctv_common_areas: "Videovigilancia en áreas comunes",
    cctv_outside_property: "Videovigilancia exterior",
    "24h_security": "Seguridad 24 h",
    security_alarm: "Alarma de seguridad",
    smoke_alarms: "Alarma de humo",
    carbon_monoxide_detector: "Detector de monóxido de carbono",
    carbon_monoxide_sources: "Sin fuentes de monóxido de carbono",
    dishwasher: "Lavavajillas",
    toilet: "Inodoro",
    microwave: "Microondas",
    electric_kettle: "Hervidor eléctrico",
    toilet_paper: "Papel higiénico",
    tea_coffee_maker: "Té y café",
    coffee_tea_maker: "Té y café",
    view: "Vistas",
    upper_floors_elevator: "Plantas superiores con ascensor",
    guest_ids_collected_online: "Identificación online previa",
    check_in_kiosk_lobby: "Kiosko de check-in en vestíbulo",
    lockbox_key_at_property: "Caja de llaves en la propiedad",
    lockbox_key_near_property: "Caja de llaves cerca",
    phone_unlock_room_bluetooth: "Abrir habitación con móvil (Bluetooth)",
    phone_unlock_door_internet: "Abrir puerta con móvil (Internet)",
    pin_code_unlock_door: "PIN para abrir puerta",
    qr_code_scan_door: "QR para abrir puerta",
    downloadable_check_in_app_door: "App de check-in para puerta",
    phone_open_lock_bluetooth: "Abrir cerradura con móvil (Bluetooth)",
    phone_open_lock_internet: "Abrir cerradura con móvil (Internet)",
    pin_code_open_lock: "PIN para abrir cerradura",
    qr_code_scan_lock: "QR para abrir cerradura",
    downloadable_check_in_app_lock: "App de check-in para cerradura",
    invoice_provided: "Factura disponible",
    private_check_in_out: "Check-in/out privado",
    tour_desk: "Mostrador de tours",
    currency_exchange: "Cambio de divisas",
    atm_on_site: "Cajero automático",
    lockers: "Taquillas",
    ironing_service: "Servicio de planchado",
    daily_housekeeping: "Limpieza diaria",
    suit_press: "Planchado de trajes",
    pet_basket: "Cesta para mascotas",
    pet_bowls: "Cuencos para mascotas",
    key_access: "Acceso con llave",
    key_card_access: "Acceso con tarjeta",
    hypoallergenic_room: "Habitación hipoalergénica",
    smoke_free_property: "Propiedad libre de humo",
    designated_smoking_area: "Zona de fumadores",
    facilities_disabled_guests: "Instalaciones para discapacitados",
    soundproof_rooms: "Habitaciones insonorizadas",
    soundproof: "Insonorizado",
    property_toilet_grab_rails: "Baño con barras de apoyo",
    property_raised_toilet: "Inodoro elevado",
    ground_floor_unit: "Planta baja",
    room_upper_floors_elevator: "Plantas superiores con ascensor",
    room_toilet_grab_rails: "Baño con barras de apoyo",
    adapted_bath: "Baño adaptado",
    roll_in_shower: "Ducha a nivel del suelo",
    walk_in_shower: "Ducha a ras de suelo",
    room_raised_toilet: "Inodoro elevado",
    lowered_sink: "Lavabo bajo",
    emergency_cord_bathroom: "Cordón de emergencia en baño",
    shower_chair: "Silla de ducha",
    pub_crawls: "Ruta de bares",
    walking_tours: "Rutas a pie",
    bike_tours: "Rutas en bicicleta",
    misc_heating: "Calefacción",
    full_bed: "Cama completa",
    sofa_bed: "Sofá cama",
    queen_bed: "Cama queen",
    king_bed: "Cama king",
    bunk_bed: "Litera",
    entire_studio: "Estudio completo",
    entire_apartment: "Apartamento completo",
    private_room: "Habitación privada",
    private_kitchen: "Cocina privada",
    kitchenware: "Utensilios de cocina",
    stovetop: "Vitrocerámica",
    dining_area: "Zona de comedor",
    dining_table: "Mesa de comedor",
    free_toiletries: "Artículos de aseo gratis",
    bathtub_or_shower: "Bañera o ducha",
    radio: "Radio",
    cable_channels: "Canales por cable",
    socket_near_bed: "Enchufe junto a la cama",
    cleaning_products: "Productos de limpieza",
    tile_marble_floor: "Suelo de baldosa/mármol",
    high_chair: "Trona",
    children_high_chair: "Trona para niños",
    sitting_area: "Zona de estar",
    private_entrance: "Entrada privada",
    ironing_facilities: "Plancha y tabla de planchar",
    wardrobe_closet: "Armario",
    clothes_rack: "Perchero",
    dryer: "Secadora",
    ground_floor: "Planta baja",
    detached: "Independiente",
    semi_detached: "Adosado",
    private_apartment_in_building: "Apartamento privado en edificio",
    entire_unit_wheelchair_accessible: "Unidad accesible para silla de ruedas",
    single_room_ac: "Aire acondicionado individual",
    air_purifiers: "Purificadores de aire",
    hand_sanitizer: "Gel desinfectante",
    hand_sanitiser: "Gel desinfectante",
    hearing_accessible: "Accesible para personas con discapacidad auditiva",
    towels_sheets_extra_fee: "Toallas/Sábanas (cargo extra)",
    oven: "Horno",
    toaster: "Tostadora",
    shared_bathroom: "Baño compartido",
    bidet: "Bidé",
    bathrobe: "Albornoz",
    slippers: "Zapatillas",
    fan: "Ventilador",
    mosquito_net: "Mosquitera",
    blackout_curtains: "Cortinas opacas",
    carpeted_floor: "Suelo enmoquetado",
    patio: "Patio",
    garden_view: "Vistas al jardín",
    sea_view: "Vistas al mar",
    mountain_view: "Vistas a la montaña",
    city_view: "Vistas a la ciudad",
    pool_view: "Vistas a la piscina",
};
