export function getFacilityImageUrl(imagePath, facilityName) {
  if (imagePath) return imagePath

  const images = {
    discussion_room_1: '/facilities/discussion_room.jpg',
    discussion_room_2: '/facilities/discussion_room.jpg',
    discussion_room_3: '/facilities/discussion_room.jpg',
    discussion_room_4: '/facilities/discussion_room.jpg',
    discussion_room_5: '/facilities/discussion_room.jpg',
    music_room:        '/facilities/music_room.jpg',
    pool_table:        '/facilities/pool_table.jpg',
    table_tennis:      '/facilities/table_tennis.jpg',
    stem_lab:          '/facilities/stem_lab.jpg',
    event_area:        '/facilities/event_area.jpg',
    basketball_court:  '/facilities/basketball_court.jpg',
    tennis_court:      '/facilities/tennis_court.jpg',
    sport_field:       '/facilities/sport_field.jpg',
    futsal_court:      '/facilities/futsal_court.jpg',
  }
  return images[facilityName] || '/facilities/default.jpg'
}

export function formatFacilityName(facilityName) {
  const names = {
    discussion_room_1: 'Discussion Room 1',
    discussion_room_2: 'Discussion Room 2',
    discussion_room_3: 'Discussion Room 3',
    discussion_room_4: 'Discussion Room 4',
    discussion_room_5: 'Discussion Room 5',
    music_room:        'Music Room',
    pool_table:        'Pool Table',
    table_tennis:      'Table Tennis',
    stem_lab:          'STEM Lab',
    event_area:        'Event Area',
    basketball_court:  'Basketball Court',
    tennis_court:      'Tennis Court',
    sport_field:       'Sport Field',
    futsal_court:      'Futsal Court',
  }
  return names[facilityName] || facilityName
}

export function getFacilityPlaceholder() {
  return '/facilities/default.jpg'
}