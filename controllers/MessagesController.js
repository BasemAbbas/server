const Message = require('../models/Messages');
const Player = require('../models/Player');

const createMessage = async (req, res) => {
  const { player1username, player2username } = req.body;

  try {
    // Check if a message object already exists
    const existingMessage = await Message.findOne({
      player1: player1username,
      player2: player2username,
    });

    if (!existingMessage) {
      // Create a new message object if none exists
      const newMessage = new Message({
        player1: player1username,
        player2: player2username,
      });

      await newMessage.save();

      // Link the new message with player1 and player2
      await Player.findOneAndUpdate(
        { username: player1username },
        { $push: { messages: newMessage._id } },
        { new: true }
      );
      await Player.findOneAndUpdate(
        { username: player2username },
        { $push: { messages: newMessage._id } },
        { new: true }
      );
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while creating the message object' });
  }
};

const getChatMessages = async (req, res) => {
  const { player1username, player2username } = req.body;

  try {
    // Fetch messages based on sender and receiver
    const msgs = await Message.find({
      $or: [
        { player1: player1username, player2: player2username },
        { player1: player2username, player2: player1username },
      ],
    }).sort({ timestamp: 1 });
    const formattedMessages = msgs.map((message) => ({
      messages: message.messages.map((msg) => ({
        sender: msg.sender,
        content: msg.content,
        timestamp: msg.timestamp,
      })),
    }));
    res.status(200).json(formattedMessages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const sendMessage = async (req, res) => {
  const { sender, receiver, message } = req.body;

  try {
    // Find or create the existing message
    let existingMessage = await Message.findOne({
      $or: [
        { player1: sender, player2: receiver },
        { player1: receiver, player2: sender },
      ],
    });

    if (!existingMessage) {
      // Create a new message object if none exists
      existingMessage = new Message({
        player1: sender,
        player2: receiver,
      });
    }

    // Update the existing message by pushing the new message details
    const messageSender = existingMessage.player1 === sender ? 'player1' : 'player2';
    existingMessage.messages.push({
      sender: messageSender,
      content: message,
      timestamp: Date.now(),
    });

    // Save the updated message
    await existingMessage.save();

    res.status(200).json({ message: 'Message sent successfully' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { createMessage, getChatMessages, sendMessage };