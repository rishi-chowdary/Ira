/**
 * Friends API Module
 * Handles friend relationships, friend lending, and endorsements
 * 
 * Endpoints:
 * POST   /api/friends/add - Send friend request
 * GET    /api/friends/:userId - Get friend list
 * POST   /api/friends/:friendshipId/accept - Accept friend request
 * POST   /api/friends/:friendshipId/reject - Reject friend request
 * POST   /api/friends/endorse - Endorse a friend's creditworthiness
 * GET    /api/friends/:userId/endorsements - Get endorsements received
 * POST   /api/friends/:userId/block - Block a user
 */

const supabase = require('./_supabase');

/**
 * POST /api/friends/add
 * Send a friend request to another student
 * 
 * Request:
 * {
 *   user_id: 1,
 *   friend_id: 2
 * }
 */
async function handleAddFriend(req, res) {
  try {
    const { user_id, friend_id } = req.body;

    // Validation
    if (!user_id || !friend_id) {
      return res.status(400).json({
        error: 'User ID and Friend ID required'
      });
    }

    if (user_id === friend_id) {
      return res.status(400).json({
        error: 'Cannot add yourself as friend'
      });
    }

    // Check if friend exists
    const { data: friend, error: friendError } = await supabase
      .from('user_accounts')
      .select('id')
      .eq('id', friend_id)
      .single();

    if (friendError || !friend) {
      return res.status(404).json({
        error: 'Friend not found'
      });
    }

    // Check if already friends
    const { data: existing } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', user_id)
      .eq('friend_id', friend_id)
      .single();

    if (existing) {
      return res.status(409).json({
        error: 'Already connected or request pending'
      });
    }

    // Create friend request
    const { data: request, error: requestError } = await supabase
      .from('friends')
      .insert([{
        user_id,
        friend_id,
        status: 'pending',
        requested_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (requestError) throw requestError;

    // Send notification to friend
    await supabase
      .from('notifications')
      .insert([{
        user_id: friend_id,
        type: 'friend_request',
        title: 'Friend Request',
        message: 'You have a new friend request',
        related_user_id: user_id
      }])
      .catch(() => {}); // Ignore notification errors

    res.status(201).json({
      success: true,
      message: 'Friend request sent',
      request_id: request.id,
      status: 'pending'
    });
  } catch (error) {
    console.error('Add friend error:', error);
    res.status(500).json({
      error: error.message || 'Failed to add friend'
    });
  }
}

/**
 * GET /api/friends/:userId
 * Get friend list (approved friends only)
 * 
 * Query params:
 * - status: "approved", "pending", "all"
 */
async function handleGetFriendsrends(req, res) {
  try {
    const { userId } = req.params;
    const { status = 'approved' } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID required'
      });
    }

    let query = supabase
      .from('friends')
      .select('*, friend:user_accounts!friend_id(id, full_name, email, college_approval_status, batua_activated)')
      .eq('user_id', userId);

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: friends, error } = await query;

    if (error) throw error;

    // Get endorsement counts for each friend
    let enhancedFriends = friends || [];

    if (status === 'approved' || status === 'all') {
      for (let i = 0; i < enhancedFriends.length; i++) {
        const { count } = await supabase
          .from('friend_endorsements')
          .select('id', { count: 'exact' })
          .eq('friend_id', enhancedFriends[i].friend_id)
          .eq('status', 'approved');

        enhancedFriends[i].endorsement_count = count;
      }
    }

    res.status(200).json({
      user_id: userId,
      friends: enhancedFriends,
      count: enhancedFriends.length
    });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch friends'
    });
  }
}

/**
 * POST /api/friends/:friendshipId/accept
 * Accept a friend request
 */
async function handleAcceptFriend(req, res) {
  try {
    const { friendshipId } = req.params;
    const { user_id } = req.body;

    if (!friendshipId || !user_id) {
      return res.status(400).json({
        error: 'Friendship ID and User ID required'
      });
    }

    // Get friendship request
    const { data: friendship, error: fetchError } = await supabase
      .from('friends')
      .select('*')
      .eq('id', friendshipId)
      .single();

    if (fetchError || !friendship) {
      return res.status(404).json({
        error: 'Friend request not found'
      });
    }

    // Verify user is the recipient
    if (friendship.friend_id !== parseInt(user_id)) {
      return res.status(403).json({
        error: 'Unauthorized'
      });
    }

    if (friendship.status !== 'pending') {
      return res.status(400).json({
        error: `Cannot accept friendship with status: ${friendship.status}`
      });
    }

    // Update friendship
    const { error: updateError } = await supabase
      .from('friends')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', friendshipId);

    if (updateError) throw updateError;

    // Send notification to requester
    await supabase
      .from('notifications')
      .insert([{
        user_id: friendship.user_id,
        type: 'friend_accepted',
        title: 'Friend Request Accepted',
        message: 'Your friend request was accepted',
        related_user_id: user_id
      }])
      .catch(() => {}); // Ignore notification errors

    res.status(200).json({
      success: true,
      message: 'Friend request accepted',
      friendship_id: friendshipId
    });
  } catch (error) {
    console.error('Accept friend error:', error);
    res.status(500).json({
      error: error.message || 'Failed to accept friend'
    });
  }
}

/**
 * POST /api/friends/:friendshipId/reject
 * Reject a friend request
 */
async function handleRejectFriend(req, res) {
  try {
    const { friendshipId } = req.params;
    const { user_id } = req.body;

    if (!friendshipId || !user_id) {
      return res.status(400).json({
        error: 'Friendship ID and User ID required'
      });
    }

    // Get friendship request
    const { data: friendship } = await supabase
      .from('friends')
      .select('*')
      .eq('id', friendshipId)
      .single();

    if (!friendship) {
      return res.status(404).json({
        error: 'Friend request not found'
      });
    }

    // Verify user is the recipient
    if (friendship.friend_id !== parseInt(user_id)) {
      return res.status(403).json({
        error: 'Unauthorized'
      });
    }

    // Delete friendship request
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', friendshipId);

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Friend request rejected'
    });
  } catch (error) {
    console.error('Reject friend error:', error);
    res.status(500).json({
      error: error.message || 'Failed to reject friend'
    });
  }
}

/**
 * POST /api/friends/endorse
 * Endorse a friend's creditworthiness
 * 
 * Request:
 * {
 *   endorser_id: 1,
 *   friend_id: 2,
 *   rating: 5,  // 1-5 stars
 *   comment: "Very trustworthy person"
 * }
 */
async function handleEndorseFriend(req, res) {
  try {
    const { endorser_id, friend_id, rating, comment } = req.body;

    // Validation
    if (!endorser_id || !friend_id || !rating) {
      return res.status(400).json({
        error: 'Endorser ID, Friend ID, and Rating required'
      });
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({
        error: 'Rating must be integer between 1-5'
      });
    }

    if (endorser_id === friend_id) {
      return res.status(400).json({
        error: 'Cannot endorse yourself'
      });
    }

    // Check if they are friends
    const { data: friendship } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', endorser_id)
      .eq('friend_id', friend_id)
      .eq('status', 'approved')
      .single();

    if (!friendship) {
      return res.status(403).json({
        error: 'You must be friends with this person to endorse them'
      });
    }

    // Check if already endorsed
    const { data: existingEndorsement } = await supabase
      .from('friend_endorsements')
      .select('id')
      .eq('endorser_id', endorser_id)
      .eq('friend_id', friend_id)
      .single();

    let endorsement;

    if (existingEndorsement) {
      // Update existing endorsement
      const { data, error } = await supabase
        .from('friend_endorsements')
        .update({
          rating,
          comment,
          created_at: new Date().toISOString()
        })
        .eq('endorser_id', endorser_id)
        .eq('friend_id', friend_id)
        .select()
        .single();

      if (error) throw error;
      endorsement = data;
    } else {
      // Create new endorsement
      const { data, error } = await supabase
        .from('friend_endorsements')
        .insert([{
          endorser_id,
          friend_id,
          rating,
          comment,
          status: 'approved',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      endorsement = data;
    }

    // Send notification to endorsed friend
    await supabase
      .from('notifications')
      .insert([{
        user_id: friend_id,
        type: 'endorsement',
        title: 'You received an endorsement!',
        message: `${endorser_id} endorsed you with a ${rating}-star rating`,
        related_user_id: endorser_id
      }])
      .catch(() => {}); // Ignore notification errors

    res.status(200).json({
      success: true,
      message: 'Endorsement created successfully',
      endorsement: {
        endorsement_id: endorsement.id,
        endorser_id,
        friend_id,
        rating,
        comment
      }
    });
  } catch (error) {
    console.error('Endorse friend error:', error);
    res.status(500).json({
      error: error.message || 'Endorsement failed'
    });
  }
}

/**
 * GET /api/friends/:userId/endorsements
 * Get endorsements received by a user
 */
async function handleGetEndorsements(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        error: 'User ID required'
      });
    }

    const { data: endorsements, error } = await supabase
      .from('friend_endorsements')
      .select('*')
      .eq('friend_id', userId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate average rating
    const avgRating = endorsements && endorsements.length > 0
      ? (endorsements.reduce((sum, e) => sum + e.rating, 0) / endorsements.length).toFixed(1)
      : 0;

    res.status(200).json({
      user_id: userId,
      endorsements: endorsements || [],
      total_endorsements: endorsements?.length || 0,
      average_rating: parseFloat(avgRating)
    });
  } catch (error) {
    console.error('Get endorsements error:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch endorsements'
    });
  }
}

/**
 * POST /api/friends/:userId/block
 * Block a user from sending friend requests and lending
 */
async function handleBlockUser(req, res) {
  try {
    const { userId } = req.params;
    const { blocked_user_id } = req.body;

    // Validation
    if (!userId || !blocked_user_id) {
      return res.status(400).json({
        error: 'User ID and Blocked User ID required'
      });
    }

    if (userId === blocked_user_id) {
      return res.status(400).json({
        error: 'Cannot block yourself'
      });
    }

    // Check if already blocked
    const { data: existing } = await supabase
      .from('blocked_users')
      .select('id')
      .eq('user_id', userId)
      .eq('blocked_user_id', blocked_user_id)
      .single();

    if (existing) {
      return res.status(409).json({
        error: 'User already blocked'
      });
    }

    // Create block record
    const { data: block, error } = await supabase
      .from('blocked_users')
      .insert([{
        user_id: userId,
        blocked_user_id,
        blocked_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    // Remove any existing friendships
    await supabase
      .from('friends')
      .delete()
      .eq('user_id', userId)
      .eq('friend_id', blocked_user_id);

    await supabase
      .from('friends')
      .delete()
      .eq('user_id', blocked_user_id)
      .eq('friend_id', userId);

    res.status(200).json({
      success: true,
      message: 'User blocked successfully',
      block_id: block.id
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({
      error: error.message || 'Failed to block user'
    });
  }
}

module.exports = {
  handleAddFriend,
  handleGetFriendsrends,
  handleAcceptFriend,
  handleRejectFriend,
  handleEndorseFriend,
  handleGetEndorsements,
  handleBlockUser
};
