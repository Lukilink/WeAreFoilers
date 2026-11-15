/*
 * Central pick lists. IDs are lowercase and must NEVER change once live
 * (they are stored in the database). Labels can change any time.
 * "other" always allows free text.
 */
window.CATALOG = {
  types: [
    { id: 'private', label: 'Foiler', plural: 'Foilers' },
    { id: 'school',  label: 'School', plural: 'Schools' },
    { id: 'shop',    label: 'Shop',   plural: 'Shops & rentals' }
  ],

  disciplines: [
    { id: 'wing',        label: 'Wing' },
    { id: 'pump',        label: 'Pump' },
    { id: 'prone',       label: 'Prone' },
    { id: 'kite',        label: 'Kite' },
    { id: 'downwind',    label: 'Downwind' },
    { id: 'parawing',    label: 'Parawing' },
    { id: 'foil-assist', label: 'Foil Assist' },
    { id: 'efoil',       label: 'eFoil' },
    { id: 'sup',         label: 'SUP' },
    { id: 'windfoil',    label: 'Windfoil' },
    { id: 'wake',        label: 'Wake' },
    { id: 'tow',         label: 'Tow' },
    { id: 'other',       label: 'Other' }
  ],

  levels: [
    { id: 1, label: 'Beginner',     hint: 'First flights, lots of touchdowns' },
    { id: 2, label: 'Intermediate', hint: 'Up and riding, working on turns' },
    { id: 3, label: 'Advanced',     hint: 'Jibes, tacks, linking bumps' },
    { id: 4, label: 'Pro',          hint: 'You make it look easy' }
  ],

  openFor: [
    { id: 'session-buddy',    label: 'Session buddy',    icon: 'people' },
    { id: 'show-spots',       label: 'Shows spots',      icon: 'map' },
    { id: 'lend-gear',        label: 'Lends gear',       icon: 'heart' },
    { id: 'downwind-shuttle', label: 'Downwind shuttle', icon: 'van' },
    { id: 'ride-share',       label: 'Ride share',       icon: 'car' },
    { id: 'beginner-tips',    label: 'Tips for newbies', icon: 'sparkle' },
    { id: 'coffee',           label: 'Coffee after',     icon: 'coffee' }
  ],

  brands: [
    'AFS', 'Armstrong', 'Axis', 'Cabrinha', 'Code Foils', 'Duotone', 'Ensis', 'F-One', 'Fanatic',
    'Fliteboard', 'Go Foil', 'Gong', 'Indiana', 'KT', 'Levitaz', 'Lift', 'Moses', 'Naish', 'North',
    'Ozone', 'Sabfoil', 'Slingshot', 'Starboard', 'Takoon', 'Takuma', 'Unifoil', 'Waydoo'
  ],

  /* Little lines sprinkled around the site. Add more any time. */
  quips: [
    'Locals only? Nah. Locals welcome.',
    'No kooks were harmed in the making of this map.',
    'Borrow a wing. Return it with a smile (and maybe a beer).',
    'Your next session buddy is closer than you think.',
    'Flat day? Perfect day to make friends.',
    'Every local was a tourist once.',
    'Fly low, smile high.',
    'Pump it. Then pump it again.'
  ]
};
