// ============================================================
// 🚗🌈 АВТОМАШИНЫ «БРЭНД → ЗАГВАР» ГАЗРЫН ЗУРАГ (2026-10-01)
// ============================================================
// 🎯 ЗОРИЛГО (хэрэглэгчийн хүсэлт): «автошин дээр Үйлдвэрлэгчийг сонгоход түүний
//    үйлдвэрлэсэн машинуудыг Загвар дээр нь гаргаад ирж чадах уу».
//
// 🔴 АСУУДАЛ: 🚙 «Загвар» нь ЧӨЛӨӨТ ТЕКСТ байв (`lib/locationData.js →
//    txtFilter('model', …)`) — хэрэглэгч «Prius 30»-ыг өөрөө бичих ёстой байсан
//    тул «prius», «Prius30», «prius 30» гэж холилдож, карт/шүүлт/хайлт дээр
//    зөрүүтэй харагдана ✗ (мөн ямар загвар байгааг мэдэхгүй байв).
// ✅ ШИЙДЭЛ: брэнд бүрийн ТҮГЭЭМЭЛ загваруудыг энд жагсаана → форм ба sidebar-ийн
//    🚙 «Загвар» талбар нь брэнд сонгомогц ХАЙЛТТАЙ жагсаалт (combobox) болно
//    («pri» бичингүүт «Prius 30/40» шүүгдэнэ) — гэхдээ ГАРААР БИЧИХ боломж
//    ХЭВЭЭР ✓ (жагсаалтад байхгүй брэнд/загвар нь өмнөх шигээ чөлөөт текст ✓)
//
// 📐 БҮТЭЦ:
//   • `CAR_MODELS`         — `{ 'Toyota': ['Prius 30', …], … }` (⟷ `CAR_BRANDS`)
//   • `getCarModels(brand)`— жижиг/том үсэг, зай ЯЛГАХГҮЙ хайлт ('' → `[]`)
//   • `lookupMap(map, key)`— ⚠️ UI-д зориулсан ерөнхий хайлт (талбарын
//                            `optionsMap` мета-г уншина; `getCarModels` ч үүнийг
//                            ашиглана ✓)
//   • `keepDependentValue()`— 🔗 брэнд солигдоход хуучин загварыг цэвэрлэх ДҮРЭМ
//
// ⚠️ ЭНЭ МОДУЛЬ НЬ ЗӨВХӨН ӨГӨГДӨЛ + ЦЭВЭР ФУНКЦ (сүлжээ/DB-д ХҮРЭХГҮЙ) —
//    `lib/locationData.js` (форм/sidebar-ийн тодорхойлолт), `components/*` (UI)
//    ба `scripts/*.mjs` (тест, seed) БҮГД ЯГ НЭГ ЭХ СУРВАЛЖААС уншина ✓
// ⚠️ Загвар нь зөвхөн «САНАЛ БОЛГОХ» жагсаалт — утга нь DB-д (`attrs->>model`)
//    ХЭВЭЭР хадгалагдана. DB migration / `CHECK` / индекс ШААРДЛАГАГҮЙ ✓
//    (шүүлт нь `ilike %…%` хэвээр — хуучин «prius» гэсэн бүрэн бус утга ч олдоно ✓)
// ============================================================

/**
 * 🚗 БРЭНД → ЗАГВАР. Түлхүүр бүр нь ЗААВАЛ `CAR_BRANDS`-д байх ёстой
 * (`scripts/test-filters.mjs` үүнийг шалгана ✓).
 *
 * ⚠️ ЖАГСААЛТ НЬ ТҮГЭЭМЭЛ (бүрэн БИШ): Монголын зах зээлд зарагдаж буй загварууд,
 *    үе үеийн нэршилтэй нь («Prius 20/30/40», «Land Cruiser 100/200»).
 *    ℹ️ Хэрэглэгч жагсаалтад байхгүй загвараа ГАРААР бичиж болно (өмнөх зан ✓)
 * ℹ️ Сэлбэг, хэрэгслийн брэнд (Bosch · Michelin · Bridgestone · Denso · NGK ·
 *    Osram · Icom · Castrol) ба «Бусад» нь ЗОРИУДАА БАЙХГҮЙ — тэдний «загвар»
 *    нь барааны нэр («Тосны шүүр», «Дугуй 205/55 R16») тул чөлөөт текст
 *    хэвээр байх ёстой ✓ (`getCarModels()` → `[]`)
 */
export const CAR_MODELS = {
  // ---------- 🇯🇵 Суудлын / жийп (Япон) — Монголд хамгийн түгээмэл ----------
  Toyota: [
    'Prius 20', 'Prius 30', 'Prius 40', 'Sai', 'Aqua', 'Vitz', 'Yaris', 'Corolla Axio',
    'Corolla Fielder', 'Corolla', 'Camry', 'Allion', 'Premio', 'Mark II', 'Mark X',
    'Crown', 'Harrier', 'RAV4', 'Vanguard', 'Wish', 'Noah', 'Voxy', 'Estima',
    'Alphard', 'Vellfire', 'Sienta', 'Succeed', 'Probox', 'Ist', 'Passo',
    'Land Cruiser 80', 'Land Cruiser 100', 'Land Cruiser 200', 'Land Cruiser 300',
    'Land Cruiser Prado 90', 'Land Cruiser Prado 120', 'Land Cruiser Prado 150',
    'Highlander', 'Fortuner', 'Hilux', 'FJ Cruiser', 'C-HR', 'Hiace', 'Regius',
    'Regius Ace', 'Coaster', 'Dyna', 'Toyoace',
  ],
  Lexus: [
    'LX 470', 'LX 570', 'LX 600', 'GX 460', 'GX 470', 'RX 300', 'RX 330', 'RX 350',
    'RX 400h', 'RX 450', 'RX 450h', 'ES 250', 'ES 300', 'ES 350', 'IS 200',
    'IS 250', 'IS 300', 'NX 200', 'NX 300', 'CT 200h', 'UX 200', 'LS 460', 'LS 500',
  ],
  Nissan: [
    'X-Trail', 'Qashqai', 'Juke', 'Murano', 'Teana', 'Skyline', 'Fuga', 'Sylphy',
    'Tiida', 'Note', 'March', 'Micra', 'Wingroad', 'AD', 'Serena', 'Elgrand',
    'Largo', 'Prairie', 'Leaf', 'Patrol', 'Pathfinder', 'Terrano', 'Xterra',
    'Navara', 'Caravan', 'Urvan', 'Atlas', 'Civilian', 'NV200',
  ],
  Honda: [
    'Fit', 'Jazz', 'Civic', 'Accord', 'Inspire', 'Insight', 'CR-V', 'HR-V', 'Vezel',
    'Odyssey', 'Stepwgn', 'Stream', 'Airwave', 'Freed', 'City', 'Legend', 'Elysion',
    'CR-Z', 'Dio 35', 'CBR 250', 'CBR 400', 'CB 400', 'CB 1300', 'Wave 110',
  ],
  Mazda: [
    'Demio', 'Mazda 2', 'Atenza', 'Mazda 6', 'Axela', 'Mazda 3', 'CX-3', 'CX-30',
    'CX-5', 'CX-7', 'CX-8', 'CX-9', 'MX-5', 'Premacy', 'Biante', 'MPV', 'Verisa',
    'Carol', 'Tribute', 'Capella', 'Bongo', 'Titan',
  ],
  Mitsubishi: [
    'Pajero', 'Pajero iO', 'Pajero Sport', 'Pajero Mini', 'Outlander', 'Delica',
    'Delica D:5', 'RVR', 'ASX', 'Eclipse Cross', 'Lancer', 'Lancer Evolution',
    'Galant', 'Colt', 'Nativa', 'Minica', 'Canter', 'Fuso', 'L200', 'Triton',
  ],
  Subaru: [
    'Forester', 'Outback', 'Legacy', 'Impreza', 'XV', 'Crosstrek', 'Exiga',
    'Levorg', 'Tribeca', 'WRX', 'WRX STI', 'BRZ', 'Sambar', 'Stella', 'Pleo',
  ],
  Suzuki: [
    'Swift', 'Vitara', 'Grand Vitara', 'Escudo', 'SX4', 'Jimny', 'Solio', 'Wagon R',
    'Hustler', 'Spacia', 'Alto', 'Every', 'Carry', 'XL7', 'Ertiga', 'Baleno',
    'Ciaz', 'Kizashi', 'Liana', 'Ignis', 'Gixxer',
  ],

  // ---------- 🇰🇷 Солонгос ----------
  Hyundai: [
    'Accent', 'Elantra', 'Avante', 'Sonata', 'Grandeur', 'Verna', 'Getz', 'Matrix',
    'i10', 'i20', 'i30', 'ix35', 'Tucson', 'Santa Fe', 'Palisade', 'Creta',
    'Veracruz', 'Trajet', 'Starex', 'Grand Starex', 'H1', 'H100', 'County',
    'Mighty', 'Porter', 'Porter II', 'Xcient', 'Truck',
  ],
  Kia: [
    'Morning', 'Picanto', 'Ray', 'Rio', 'K3', 'Cerato', 'Forte', 'K5', 'Optima',
    'K7', 'K8', 'K9', 'Sportage', 'Sorento', 'Seltos', 'Soul', 'Carnival', 'Carens',
    'Bongo', 'Bongo III', 'K2700', 'Pregio', 'Mohave', 'Borrego', 'Stinger',
    'Niro', 'EV6', 'Pegas',
  ],
  Genesis: ['G70', 'G80', 'G90', 'GV70', 'GV80', 'GV60', 'DH', 'EQ900'],

  // ---------- 🇩🇪 Герман ----------
  Volkswagen: [
    'Golf', 'Golf Plus', 'Polo', 'Jetta', 'Bora', 'Passat', 'CC', 'Beetle',
    'Tiguan', 'Teramont', 'Touareg', 'Amarok', 'Caddy', 'Transporter',
    'Multivan', 'Crafter', 'Arteon', 'T-Roc', 'ID.4',
  ],
  BMW: [
    'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', '318i', '320i', '325i', '328i',
    '520i', '523i', '528i', '530i', '730i', '740i', '750i', '120i', '218i',
    '420i', 'M3', 'M5', 'M4', 'Z4', 'i3', 'i4', 'iX', 'E90', 'E60',
  ],
  'Mercedes-Benz': [
    'A 180', 'A 200', 'B 180', 'C 180', 'C 200', 'C 250', 'C 300', 'E 200',
    'E 220', 'E 250', 'E 300', 'E 350', 'S 500', 'S 560', 'S 600', 'CLA 200',
    'CLA 250', 'CLS 350', 'G 400', 'G 500', 'G 63', 'GLK 300', 'GLC 300',
    'GLE 400', 'GLE 450', 'ML 350', 'ML 400', 'V 250', 'Vito', 'Sprinter',
    'EQC', 'V 220',
  ],
  Audi: [
    'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'TT',
    'RS6', 'S4', 'e-tron', 'Q5 Quattro',
  ],
  Porsche: ['Cayenne', 'Macan', 'Panamera', '911', 'Taycan', 'Boxster', 'Cayman'],

  // ---------- 🇪🇺 Европ (бусад) ----------
  Opel: [
    'Astra', 'Corsa', 'Insignia', 'Zafira', 'Mokka', 'Vivaro', 'Movano',
    'Vectra', 'Omega', 'Antara', 'Meriva', 'Combo',
  ],
  Peugeot: [
    '206', '207', '301', '307', '308', '408', '407', '508', '2008', '3008',
    '5008', 'Partner', 'Expert', 'Boxer', 'Traveller',
  ],
  Citroen: [
    'C3', 'C4', 'C5', 'C-Elysee', 'C3 Aircross', 'Berlingo', 'Jumpy', 'Jumper',
    'Xsara', 'Space Tourer',
  ],
  Renault: [
    'Logan', 'Sandero', 'Duster', 'Kaptur', 'Arkana', 'Megan', 'Fluence',
    'Laguna', 'Scenic', 'Kangoo', 'Traffic', 'Master', 'Symbol', 'Talisman',
  ],
  Skoda: [
    'Fabia', 'Rapid', 'Octavia', 'Superb', 'Yeti', 'Roomster', 'Kodiaq',
    'Karoq', 'Kamiq', 'Citigo', 'Scala',
  ],
  Volvo: [
    'XC60', 'XC90', 'XC40', 'XC70', 'S40', 'S60', 'S80', 'S90', 'V40', 'V50',
    'V60', 'V90', 'C30',
  ],
  'Land Rover': [
    'Discovery', 'Discovery Sport', 'Discovery 4', 'Freelander', 'Freelander 2',
    'Range Rover', 'Range Rover Sport', 'Range Rover Evoque', 'Range Rover Velar',
    'Defender',
  ],
  Jaguar: ['X-Type', 'S-Type', 'XF', 'XJ', 'XE', 'F-Pace', 'E-Pace', 'F-Type'],
  Mini: ['Cooper', 'Cooper S', 'Countryman', 'Clubman', 'Convertible', 'Paceman'],
  SsangYong: [
    'Rexton', 'Rexton W', 'Korando', 'Tivoli', 'Actyon', 'Kyron', 'Musso',
    'Rodius', 'Chairman', 'Istana', 'Stavic',
  ],
  // ---------- 🇺🇸 Америк ----------
  Ford: [
    'Fiesta', 'Focus', 'Mondeo', 'Fusion', 'Escape', 'Edge', 'Explorer',
    'Expedition', 'Expedition EL', 'Ranger', 'F-150', 'Transit', 'Transit Custom',
    'Econoline', 'Mustang', 'Everest', 'Bronco', 'Escape Hybrid',
  ],
  Chevrolet: [
    'Spark', 'Aveo', 'Lacetti', 'Cruze', 'Cobalt', 'Malibu', 'Captiva', 'Orlando',
    'Trailblazer', 'Colorado', 'Tracker', 'Silverado', 'Tahoe', 'Suburban',
    'Nubira', 'Epica',
  ],
  Daewoo: [
    'Matiz', 'Tico', 'Nexia', 'Espero', 'Leganza', 'Nubira', 'Kalos', 'Gentra',
    'Damas', 'Labo', 'Lanos', 'Magnus',
  ],
  Jeep: [
    'Grand Cherokee', 'Cherokee', 'Compass', 'Renegade', 'Wrangler', 'Liberty',
    'Patriot', 'Gladiator', 'Grand Wagoneer',
  ],
  Cadillac: ['Escalade', 'CTS', 'SRX', 'XT5', 'XT6', 'CT6', 'ATS', 'XTS', 'BLS'],
  Buick: ['Enclave', 'Encore', 'Envision', 'GL8', 'LaCrosse', 'Regal', 'Century', 'Rendezvous'],
  Tesla: ['Model 3', 'Model Y', 'Model S', 'Model X'],
  Infiniti: [
    'QX56', 'QX60', 'QX70', 'QX80', 'FX35', 'FX37', 'FX45', 'EX35', 'G25',
    'G35', 'G37', 'M35', 'M37', 'Q50', 'Q70',
  ],
  Acura: ['MDX', 'RDX', 'TLX', 'TL', 'TSX', 'ZDX', 'RL', 'Integra'],

  // ---------- 🇨🇳 Хятад (ба Монголд шинээр орж ирж буй) ----------
  Haval: ['H2', 'H5', 'H6', 'H6 GT', 'H9', 'Jolion', 'Dargo', 'F7', 'F7x', 'M6'],
  'Great Wall': [
    'Steed', 'Deer', 'Voleex C30', 'M4', 'Wingle 5', 'Wingle 7', 'Wingle 9',
    'Poer', 'Sailor', 'Peri',
  ],
  Chery: [
    'QQ', 'Very', 'Bonus', 'Arrizo 3', 'Arrizo 5', 'Arrizo 8', 'Tiggo 2',
    'Tiggo 3', 'Tiggo 4', 'Tiggo 5', 'Tiggo 7', 'Tiggo 7 Pro', 'Tiggo 8',
    'Tiggo 8 Pro', 'Tiggo 9', 'Eastar',
  ],
  Geely: [
    'Coolray', 'Atlas', 'Atlas Pro', 'Tugella', 'Monjaro', 'Emgrand', 'Emgrand X7',
    'Emgrand EC7', 'Boyue', 'Cityray', 'Okavango', 'Vision', 'Xingyue', 'Galaxy L7',
  ],
  Changan: [
    'Alsvin', 'Eado', 'CS15', 'CS35 Plus', 'CS55', 'CS55 Plus', 'CS75',
    'CS75 Plus', 'CS85', 'CS95', 'UNI-T', 'UNI-K', 'UNI-V', 'Hunter', 'Star',
  ],
  Jetour: ['X70', 'X70 Plus', 'X90', 'X90 Plus', 'X95', 'Dashing', 'T2', 'Shanhai L9'],
  Exeed: ['LX', 'TX', 'TXL', 'VX', 'RX', 'Yaoguang', 'Sterra ES'],
  Tank: ['Tank 300', 'Tank 400', 'Tank 500', 'Tank 700'],
  Omoda: ['Omoda 5', 'Omoda C5', 'Omoda C5 GT', 'Omoda 7', 'Omoda E5'],
  BAIC: [
    'X25', 'X35', 'X55', 'X7', 'BJ40', 'BJ80', 'U5 Plus', 'EU5', 'Senova D50',
    'Senova X25',
  ],
  Hongqi: ['H5', 'H7', 'H9', 'HS3', 'HS5', 'HS7', 'E-HS9', 'L5', 'E-QM5'],
  BYD: [
    'F3', 'F0', 'Song', 'Song Pro', 'Song Plus', 'Song Plus DM-i', 'Tang',
    'Han', 'Qin', 'Qin Plus', 'Yuan Plus', 'Yuan Pro', 'Seal', 'Dolphin',
    'Seagull', 'Atto 3', 'e2', 'M6', 'e6',
  ],
  Zeekr: ['001', '007', '009', 'X', '7X', 'MIX'],
  'Li Auto': ['L6', 'L7', 'L8', 'L9', 'MEGA'],
  Voyah: ['Free', 'Dreamer', 'Passion', 'Courage', 'Knowledge'],
  Nio: ['ES6', 'ES7', 'ES8', 'EC6', 'EC7', 'ET5', 'ET7', 'EL6', 'EL7'],
  Xpeng: ['G3', 'G3i', 'G6', 'G9', 'P5', 'P7', 'X9'],
  Leapmotor: ['T03', 'C01', 'C10', 'C11', 'C16'],
  Deepal: ['SL03', 'S05', 'S07', 'G318'],
  Avatr: ['11', '12', '07'],
  Polestar: ['Polestar 1', 'Polestar 2', 'Polestar 3', 'Polestar 4'],

  // ---------- 🚚 Ачааны / автобус ----------
  Isuzu: [
    'Elf', 'Elf 3.5т', 'Elf 4.5т', 'NPR', 'NQR', 'Forward', 'Giga', 'Journey',
    'D-Max', 'MU-X', 'Ascender',
  ],
  JAC: [
    'T6', 'T8', 'N 120', 'N 350', 'N 500', 'Sunray', 'Refine', 'S3', 'S5', 'X200', 'iEV',
  ],
  Shacman: ['X3000', 'X5000', 'F3000', 'L3000', 'H3000', 'SX 3255', 'Traction 6x4'],
  Dongfeng: [
    'Captain', 'Rich 6', 'T5', 'T5 Evo', 'H30', 'A30', 'S50', 'Экспресс',
    'Тяньжин', 'HF9', 'DFH 6x4',
  ],
  Foton: [
    'Auman', 'Aumark', 'Forland', 'Tunland', 'View', 'Saga', 'Ollin', 'Toano',
    'Truck 6x4',
  ],
  FAW: ['J6', 'J7', 'Tiger V', 'Besturn B50', 'Besturn X40', 'Xiali', 'Vita', 'Sirius', 'T80'],
  Howo: ['A7', 'T7H', 'T5G', '371', '380', '336', 'Sinotruk 6x4', 'Dump 8x4'],
  Higer: [
    'KLQ 6100', 'KLQ 6848', 'KLQ 6900', 'KLQ 6129', 'Coach 45', 'Coach 35',
    'KLQ 6608',
  ],
  Yutong: ['ZK 6122', 'ZK 6852', 'ZK 6116', 'ZK 6899', 'E12', 'E10', 'ICe 12', 'ZK 6758'],
  MAN: ['TGX', 'TGS', 'TGA', 'TGL', 'F2000', "Lion's Coach", 'F 2000 6x4'],
  Scania: ['R 420', 'R 440', 'R 500', 'G 410', 'P 380', 'S 500', 'R 470', 'P 94'],
  DAF: ['XF 105', 'XF 95', 'CF 85', 'LF 45', 'XF 106', 'CF 75'],
  Камаз: ['65115', '6520', '4308', '5320', '5490', '5460', '55111', '65117'],
  ГАЗ: ['Газель', 'Газель Next', 'Соболь', 'Соболь Баргузин', '3307', '3309', 'Валдай', '66'],
  ЗИЛ: ['130', '131', '431410', '4331', '5301', '555'],
  UAZ: ['Patriot', 'Hunter', '452', '3962', '31519', 'Profi', 'Pickup', '3151'],
  Lada: [
    'Niva', 'Niva Legend', 'Niva Travel', '2101', '2107', '2109', '2110', '2112',
    '2114', '2115', 'Granta', 'Vesta', 'Largus', 'Kalina', 'Priora', 'Samara',
  ],
  Ravon: ['Nexia R3', 'Gentra', 'Matiz', 'R4', 'Spark', 'Damas', 'Labo', 'Lacetti'],

  // ---------- 🚜 Трактор, хөдөө аж ахуй ----------
  YTO: ['MF 244', 'MF 354', 'MF 454', 'MF 554', 'X 804', 'LX 904', 'ELX 1304', 'SG 604'],
  'John Deere': [
    '1025R', '5045E', '5055E', '5065E', '5075E', '6125J', '6155R', '8R 340', '3050E',
  ],
  Беларус: ['320', '820', '892', '952', '1025', '1221', '1523', '3022'],
  MTZ: ['820', '892', '952', '1025', '1221', '1523', '3022', 'Анжис 3 м'],
  Zoomlion: ['RK 704', 'RS 1304', 'RD 904', 'ZL 30', 'ZE 215', 'ZTC250', 'DV 90'],
  Кировец: ['K-700', 'K-701', 'K-744', 'K-9360', 'K-9400'],
  Lovol: ['TE 244', 'M 504', 'M 554', 'M 704', 'P 704', 'FL 956', 'ЗТ-244'],

  // ---------- 🏍️ Мотоцикл ----------
  Yamaha: [
    'R15', 'R3', 'R6', 'R1', 'FZ 25', 'MT-15', 'MT-03', 'MT-07', 'NMAX', 'Nouvo',
    'Mio', 'Fino', 'Aerox', 'XSR 700', 'TMAX', 'VMAX', 'XTZ 125', 'Crypton',
  ],
  Kawasaki: [
    'Ninja 250', 'Ninja 400', 'Ninja 650', 'Z 250', 'Z 400', 'Z 650', 'Z 900',
    'Versys 300', 'Versys 650', 'KLX 250', 'D-Tracker', 'W 800', 'Eliminator 400',
  ],
  KTM: [
    'Duke 125', 'Duke 200', 'Duke 250', 'Duke 390', 'Duke 790', 'RC 200', 'RC 390',
    'Adventure 250', 'Adventure 390', 'EXC 300',
  ],
  Bajaj: [
    'Pulsar 135', 'Pulsar 150', 'Pulsar NS 200', 'Pulsar RS 200', 'Discover 125',
    'Platina 100', 'Avenger 220', 'Boxer 150', 'CT 100', 'Dominar 400',
  ],
  Vespa: ['LX 125', 'Sprint 150', 'Primavera 150', 'GTS 300', 'Elettrica', '946'],
};

/**
 * ⚠️ Хайлтын хүснэгтийн КЭШ (`WeakMap`) — `lookupMap` нь дахин дахин дуудагдана
 *    (талбар бүр, бичих БҮРД) тул газрын зураг бүрийг ЗӨВХӨН НЭГ УДАА
 *    хэвийн болгоно ✓ (модуль түвшинд — browser/node хоёуланд ажиллана ✓)
 */
const NORMALIZED = new WeakMap();

/** `{ 'Toyota': [...] }` → `Map('toyota' → [...])` (зай/том үсэг хасна) */
function normalizeMap(map) {
  if (!map || typeof map !== 'object') return null;
  let n = NORMALIZED.get(map);
  if (!n) {
    n = new Map(Object.entries(map).map(([k, v]) => [String(k).trim().toLowerCase(), v]));
    NORMALIZED.set(map, n);
  }
  return n;
}

/**
 * 🌈 ГАЗРЫН ЗУРГААС СОНГОЛТ ХАЙХ — жижиг/том үсэг, хоёр талын зайг ҮЛ ХАРГАЛЗАНА
 * (`'toyota'`, `' Toyota '` … бүгд `Toyota`-гийн загваруудыг буцаана ✓).
 *
 * ⚠️ UI (`components/AddListingClient.jsx`, `components/HomeClient.jsx`) нь талбарын
 *    `optionsMap` мета-гаар энэ функцийг дуудна — тиймээс компонент нь
 *    АВТОМАШИНЫ талаар ямар ч мэдлэггүй, зөвхөн «хамааралтай сонголт» гэдгийг
 *    мэднэ ✓ (ирээдүйд өөр хэсэгт ч ашиглаж болно).
 *
 * @param {Record<string, string[]>} map  газрын зураг (ж: `CAR_MODELS`)
 * @param {string} value                  түлхүүр (ж: брэнд) — хоосон/танигдахгүй → `[]`
 * @returns {string[]} сонголтууд (ХЭЗЭЭ Ч `undefined` БИШ ✓)
 */
export function lookupMap(map, value) {
  const key = String(value ?? '').trim().toLowerCase();
  if (!key) return [];
  const n = normalizeMap(map);
  return (n && n.get(key)) || [];
}

/**
 * 🚗 Тухайн БРЭНДИЙН загварууд — `lookupMap(CAR_MODELS, …)`-ийн товчлол.
 *
 * ⚠️ Танигдахгүй брэнд (сэлбэг: `'Bosch'`, шинэ брэнд: `'Zeekr 2'`, `'Бусад'`,
 *    `''`) → `[]` буцаана. Энэ нь ЗӨВ зан: форм/sidebar нь жагсаалт хоосон үед
 *    ЧӨЛӨӨТ ТЕКСТ талбар болж, хэрэглэгч өөрөө бичнэ ✓ (өмнөх зан төлөв)
 */
export function getCarModels(brand) {
  return lookupMap(CAR_MODELS, brand);
}

/**
 * 🔗 ХАМААРАЛТАЙ ТАЛБАРЫН ДҮРЭМ — «эцэг» талбар (ж: 🏷️ Үйлдвэрлэгч) солигдоход
 * «хүү» талбарын (ж: 🚙 Загвар) хуучин утгыг ХАДГАЛАХ эсэхийг шийднэ.
 *
 * ⚠️ ЯАГААД ХЭРЭГТЭЙ ВЭ: «Toyota Prius 30» гэсэн зар байхад хэрэглэгч брэндээ
 *    «Nissan» болговол загвар нь «Prius 30» хэвээр үлдвэл DB-д
 *    `{ brand: 'Nissan', model: 'Prius 30' }` гэсэн ЗӨРЧСӨН зар үүснэ ✗
 *
 * ⚠️ ДҮРЭМ (3 тохиолдол):
 *   ① `prevOptions`-д утга БАЙХГҮЙ (эсвэл хуучин жагсаалт ХООСОН) → утга нь
 *      ГАРААР бичсэн байх магадлалтай → ХӨНДӨХГҮЙ ✓ (ж: «Тосны шүүр»)
 *   ② `prevOptions`-д БАЙСАН ба `nextOptions`-д БАЙХГҮЙ → `''` = ЦЭВЭРЛЭНЭ ✓
 *   ③ `nextOptions` ХООСОН (шинэ брэндэд жагсаалт байхгүй, ж: «Bosch») →
 *      утгыг ХАДГАЛНА (устгах үндэслэл байхгүй ✓)
 *
 * 🚙🌂 2026-10-04 (36): `value` нь МАССИВ ч байж болно (🚙 «Загвар» олон
 *    сонголттой болов) — утга тус бүрд дээрх 3 дүрэм үйлчилж, буцаалт нь
 *    МАССИВ (хүчингүй болсон утгууд ХАСАГДАНА ✓)
 *
 * @returns {string|string[]} хадгалах утга; `''`/`[]` = ЦЭВЭРЛЭХ (эсвэл утга
 *   нь хоосон байсан)
 */
export function keepDependentValue(prevOptions, nextOptions, value) {
  /* 🚙🌂 МАССИВ (2026-10-04 (36) — ОЛОН СОНГОЛТТОЙ ЗАГВАР):
     `attrs.model` нь МАССИВ байж болно (`['Prius 30','Harrier']`) — утга
     тус БҮРД дээрх 3 дүрэм ЯГ ижилхэн үйлчилнэ, буцаалт нь мөн массив:

       prev: ['Prius 30','Тосны шүүр'], next: Nissan-ийн загварууд
         → ['Тосны шүүр']  ← Toyota-гийн загвар ХАСАГДАВ, гараар бичсэн нь ҮЛДЭВ

     ⚠️ Массивыг `String(value)` болгож нэг мөр болговол «Prius 30,Harrier»
        гэсэн ХОГ утга үүсэж, шүүлт `ilike %Prius 30,Harrier%` болж
        ХЭЗЭЭ Ч тохирохгүй ✗ — тиймээс ЭРТ буцаана ✓ */
  if (Array.isArray(value)) {
    return value
      .map((v) => keepDependentValue(prevOptions, nextOptions, v))
      .filter(Boolean);
  }
  const v = String(value ?? '').trim();
  if (!v) return '';
  const prev = Array.isArray(prevOptions) ? prevOptions : [];
  const next = Array.isArray(nextOptions) ? nextOptions : [];
  // ① хуучин жагсаалтад БАЙХГҮЙ (эсвэл жагсаалт огт байгаагүй) → гараар бичсэн ✓
  if (!prev.includes(v)) return v;
  // ③ шинэ брэндэд жагсаалт байхгүй → хөндөхгүй ✓
  if (!next.length) return v;
  // ② өөр брэндийн загвар → цэвэрлэнэ ✓
  return next.includes(v) ? v : '';
}

/**
 * 🔗 ХАМААРАЛТАЙ ТАЛБАРУУДЫГ ШИНЭЧЛЭХ — «эцэг» талбар (ж: 🏷️ Үйлдвэрлэгч)
 * солигдоход түүнээс хамаарах «хүү» талбаруудын (ж: 🚙 Загвар) ХУУЧИРСАН
 * утгыг ЦЭВЭРЛЭНЭ (`keepDependentValue`-ийн дүрмээр ✓).
 *
 * ⚠️ ФОРМ (`components/AddListingClient.jsx`) ба SIDEBAR (`components/HomeClient.jsx`)
 *    ХОЁУЛАА ЯГ ЭНЭ функцийг дуудна — дүрэм НЭГ Л ГАЗАР байх ёстой ✓
 * ⚠️ `attrs`-ыг MUTATE ХИЙХГҮЙ — хуулбарыг буцаана (React-ийн төлөв ✓)
 *
 * @param {object} attrs      ШИНЭ утгууд (`changedKey` нь аль хэдийн тавигдсан)
 * @param {object} prevAttrs  ХУУЧИН утгууд (хуучин «эцэг» утга эндээс уншина)
 * @param {string} changedKey Солигдсон талбарын түлхүүр (ж: `'brand'`)
 * @param {Array<{key: string, optionsFrom?: string, optionsMap?: object}>} fields
 *        Тухайн хэсгийн attr талбарууд (`getAttrFields` / `getAttrFilters`)
 * @returns {object} шинэчлэгдсэн `attrs`
 */
export function cascadeAttrs(attrs, prevAttrs, changedKey, fields) {
  const out = { ...attrs };
  for (const dep of (fields || [])) {
    if (dep.optionsFrom !== changedKey) continue;
    const kept = keepDependentValue(
      lookupMap(dep.optionsMap, prevAttrs ? prevAttrs[changedKey] : ''),
      lookupMap(dep.optionsMap, out[changedKey]),
      out[dep.key],
    );
    /* ⚠️ ХООСОН УТГА: `''` (скаляр) БА `[]` (олон сонголттой талбар) —
       ХОЁУЛАА «хүчингүй» гэж үзэж УСТГАНА. `[]` нь ХҮЧИНТЭЙ (truthy) тул
       энгийн `if (kept)` нь `attrs.model = []` гэсэн хоосон массив үлдээж,
       URL-д `?attr_model=` гэсэн ХООСОН түлхүүр бичигдэх байв ✗ */
    const empty = Array.isArray(kept) ? kept.length === 0 : !kept;
    if (empty) delete out[dep.key];
    else out[dep.key] = kept;
  }
  return out;
}
