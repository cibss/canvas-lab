import styles from "./LiveAnnouncer.module.css";

export interface LiveAnnouncement {
  id: number;

  message: string;
}

interface LiveAnnouncerProps {
  announcement: LiveAnnouncement | null;
}

export function LiveAnnouncer({ announcement }: LiveAnnouncerProps) {
  return (
    <div
      className={styles.liveRegion}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-relevant="additions text"
    >
      {announcement ? (
        <span key={announcement.id}>{announcement.message}</span>
      ) : null}
    </div>
  );
}
