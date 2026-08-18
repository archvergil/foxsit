export const tasksCopy = {
  views: {
    inbox: {
      eyebrow: 'Collect first',
      title: 'Inbox',
      description: 'Loose ends without a project, ready to clarify.',
      emptyTitle: 'Inbox zero.',
      emptyBody: 'Capture the next loose end above. It will stay here until you organize it.',
    },
    today: {
      eyebrow: 'Make today finite',
      title: 'Today',
      description: 'Only the tasks intentionally scheduled for this local day.',
      emptyTitle: 'Today is clear.',
      emptyBody: 'Add one meaningful task or keep the space open.',
    },
    upcoming: {
      eyebrow: 'Look ahead',
      title: 'Upcoming',
      description: 'Scheduled tasks after today, ordered for planning.',
      emptyTitle: 'Nothing scheduled ahead.',
      emptyBody: 'Use the date field above when a task belongs to a future day.',
    },
    completed: {
      eyebrow: 'Done, durably',
      title: 'Completed',
      description: 'Finished tasks remain available without crowding active work.',
      emptyTitle: 'No completed tasks yet.',
      emptyBody: 'Completed work will collect here and can always be reopened.',
    },
    project: {
      eyebrow: 'Project',
      title: 'Project tasks',
      description: 'Open work grouped under one personal project.',
      emptyTitle: 'This project is clear.',
      emptyBody: 'Add the next concrete action above.',
    },
  },
} as const
