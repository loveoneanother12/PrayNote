class NotificationItem {
  const NotificationItem({
    required this.id,
    required this.type,
    required this.message,
    required this.createdAt,
    this.groupId,
    this.prayerId,
    this.readAt,
  });

  final String id;
  final String type;
  final String message;
  final String? groupId;
  final String? prayerId;
  final DateTime createdAt;
  final DateTime? readAt;

  bool get isUnread => readAt == null;

  NotificationItem copyWith({DateTime? readAt}) => NotificationItem(
    id: id,
    type: type,
    message: message,
    groupId: groupId,
    prayerId: prayerId,
    createdAt: createdAt,
    readAt: readAt ?? this.readAt,
  );
}
