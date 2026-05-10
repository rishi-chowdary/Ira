/**
 * Notifications API Module
 * Handles in-app notifications and notification preferences
 * 
 * Endpoints:
 * GET    /api/notifications/:userId - Get user notifications (with pagination)
 * POST   /api/notifications/:notificationId/read - Mark as read
 * POST   /api/notifications/read-all - Mark all as read
 * DELETE /api/notifications/:notificationId - Delete notification
 * GET    /api/notifications/:userId/preferences - Get notification preferences
 * POST   /api/notifications/:userId/preferences - Update preferences
 */

const supabase = require('./_supabase');

/**
 * GET /api/notifications/:userId
 * Get user notifications with pagination
 * 
 * Query params:
 * - page: 1
 * - limit: 20
 * - unread_only: true|false
 */
async function handleGetNotifications(req, res) {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, unread_only = false } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID required'
      });
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId);

    if (unread_only === 'true' || unread_only === true) {
      query = query.eq('is_read', false);
    }

    query = query.order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    const { data: notifications, error, count } = await query;

    if (error) throw error;

    // Get total count
    let totalCount = count;
    if (!totalCount) {
      const { count: total } = await supabase
        .from('notifications')
        .select('id', { count: 'exact' })
        .eq('user_id', userId);

      totalCount = total || 0;
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_read', false);

    res.status(200).json({
      user_id: userId,
      notifications: notifications || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limitNum)
      },
      unread_count: unreadCount || 0
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch notifications'
    });
  }
}

/**
 * POST /api/notifications/:notificationId/read
 * Mark a notification as read
 */
async function handleMarkAsRead(req, res) {
  try {
    const { notificationId } = req.params;

    if (!notificationId) {
      return res.status(400).json({
        error: 'Notification ID required'
      });
    }

    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .single();

    if (fetchError || !notification) {
      return res.status(404).json({
        error: 'Notification not found'
      });
    }

    if (notification.is_read) {
      return res.status(200).json({
        success: true,
        message: 'Already read',
        notification
      });
    }

    const { error: updateError } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (updateError) throw updateError;

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification_id: notificationId
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      error: error.message || 'Failed to mark as read'
    });
  }
}

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read for a user
 */
async function handleMarkAllAsRead(req, res) {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({
        error: 'User ID required'
      });
    }

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', user_id)
      .eq('is_read', false);

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      user_id
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      error: error.message || 'Failed to mark all as read'
    });
  }
}

/**
 * DELETE /api/notifications/:notificationId
 * Delete a notification
 */
async function handleDeleteNotification(req, res) {
  try {
    const { notificationId } = req.params;

    if (!notificationId) {
      return res.status(400).json({
        error: 'Notification ID required'
      });
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete notification'
    });
  }
}

/**
 * GET /api/notifications/:userId/preferences
 * Get notification preferences for a user
 */
async function handleGetPreferences(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID required'
      });
    }

    let { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    // Return defaults if not set
    if (!preferences) {
      preferences = {
        user_id: userId,
        email_notifications: true,
        push_notifications: true,
        sms_notifications: false,
        loan_updates: true,
        friend_requests: true,
        endorsements: true,
        repayment_reminders: true,
        marketing_emails: false
      };
    }

    res.status(200).json({
      user_id: userId,
      preferences
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch preferences'
    });
  }
}

/**
 * POST /api/notifications/:userId/preferences
 * Update notification preferences
 * 
 * Request:
 * {
 *   email_notifications: true,
 *   push_notifications: false,
 *   sms_notifications: false,
 *   loan_updates: true,
 *   friend_requests: true,
 *   endorsements: true,
 *   repayment_reminders: true,
 *   marketing_emails: false
 * }
 */
async function handleUpdatePreferences(req, res) {
  try {
    const { userId } = req.params;
    const preferences = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID required'
      });
    }

    // Validate boolean fields
    const validFields = [
      'email_notifications',
      'push_notifications',
      'sms_notifications',
      'loan_updates',
      'friend_requests',
      'endorsements',
      'repayment_reminders',
      'marketing_emails'
    ];

    const updateObj = { user_id: userId };

    for (const field of validFields) {
      if (field in preferences) {
        if (typeof preferences[field] !== 'boolean') {
          return res.status(400).json({
            error: `${field} must be boolean`
          });
        }
        updateObj[field] = preferences[field];
      }
    }

    // Check if preferences exist
    const { data: existing } = await supabase
      .from('notification_preferences')
      .select('id')
      .eq('user_id', userId)
      .single();

    let result;

    if (existing) {
      // Update
      const { data, error } = await supabase
        .from('notification_preferences')
        .update(updateObj)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create
      const { data, error } = await supabase
        .from('notification_preferences')
        .insert([updateObj])
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    res.status(200).json({
      success: true,
      message: 'Preferences updated',
      preferences: result
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      error: error.message || 'Failed to update preferences'
    });
  }
}

/**
 * Create a notification (internal function)
 * Used by other API modules to send notifications
 */
async function createNotification(userId, type, title, message, relatedUserId = null) {
  try {
    // Check user preferences
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Map notification type to preference field
    const typeToPreference = {
      'loan_created': 'loan_updates',
      'loan_matched': 'loan_updates',
      'loan_disbursed': 'loan_updates',
      'repayment_due': 'repayment_reminders',
      'repayment_overdue': 'repayment_reminders',
      'friend_request': 'friend_requests',
      'friend_accepted': 'friend_requests',
      'endorsement': 'endorsements'
    };

    const preferenceField = typeToPreference[type];
    if (preferenceField && preferences && !preferences[preferenceField]) {
      return; // User disabled this notification type
    }

    // Create notification
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: userId,
        type,
        title,
        message,
        related_user_id: relatedUserId,
        is_read: false,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
    }

    return notification;
  } catch (error) {
    console.error('Create notification error:', error);
  }
}

module.exports = {
  handleGetNotifications,
  handleMarkAsRead,
  handleMarkAllAsRead,
  handleDeleteNotification,
  handleGetPreferences,
  handleUpdatePreferences,
  createNotification
};
