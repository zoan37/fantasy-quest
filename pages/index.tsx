import React, { useState, useEffect, useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import InstallationToast from "@/components/toast";
import { ChatMessage, MessageOutput, WindowAI, getWindowAI } from "window.ai";
import Head from "next/head";

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const aiRef = useRef<WindowAI | null>(null);

  useEffect(() => {
    const init = async () => {
      aiRef.current = await getWindowAI();
      if (aiRef.current) {
        toast.success("window.ai detected!", {
          id: "window-ai-detected",
        });
      } else {
        toast.custom(<InstallationToast />, {
          id: "window-ai-not-detected",
        });
      }
    };
    init();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inputValue) return;
    if (!aiRef.current) {
      toast.custom(<InstallationToast />, {
        id: "window-ai-not-detected",
      });
      return;
    }

    handleNewMessage(inputValue);
  };

  const handleNewMessage = async (messageInput: string) => {
    const userMessage: ChatMessage = { role: "user", content: messageInput };
    //creates a local variable to handle streaming state
    let updatedMessages: ChatMessage[] = [...messages, userMessage];
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setLoading(true);
    setInputValue("");

    //streaming options settings for window.ai
    const streamingOptions = {
      temperature: 0.7,
      maxTokens: 1000,
      onStreamResult: (result: MessageOutput | null, error: string | null) => {
        setLoading(false);
        if (error) {
          toast.error("window.ai streaming completion failed.");
          return;
        } else if (result) {
          console.log(result);
          const lastMessage = updatedMessages[updatedMessages.length - 1];
          // if the last message is from a user, init a new message
          if (lastMessage.role === "user") {
            updatedMessages = [
              ...updatedMessages,
              {
                role: "assistant",
                content: result.message.content,
              },
            ];
          } else {
            // if the last message is from the assistant, append the streaming result to the last message
            updatedMessages = updatedMessages.map((message, index) => {
              if (index === updatedMessages.length - 1) {
                return {
                  ...message,
                  content: message.content + result.message.content,
                };
              }
              return message;
            });
          }
          setMessages(updatedMessages);
        }
      },
    };

    const systemPrompt = `
      Start a text adventure game called "Fantasy Quest" in a fantasy world the player fights monsters, collects loot, levels up, with the ultimate goal of defeating the dragon king. The player starts in the village of Greenhaven. Allow the user to choose party members as well. Fill in the details. Please let the player know about the goal of defeating the dragon king at the beginning of the game. I want to play this as a text adventure. Show stats such as Health, Experience, Level, Gold, Weapons, Armor, Ring when appropiate, with the title “Current Stats:”. The numerical stats like Health, Experience, Level, Gold should actually be computed correctly. When the player levels up, you say a sentence saying that the player leveled up and to what level they leveled up to. Give choices using a numbered list. Only provide one list of choices at a time. Don’t say anything after the numbered list of choices since it should be obvious to the player that they can choose a number. Don’t use rolling of dice in the game. The dragon king should be difficult to defeat. If the player dies, the player respawns at the village of Greenhaven but with half their gold gone. During the journey, the player can encounter monsters, and collect loot (e.g. better weapons, armor, and rings). Again, you are the game master, so you provide one list of choices and the player has to reply with their choice. Please wait for the player to select a choice before providing more lists of choices. Again, don’t choose the choice for the player; wait for the player to choose the choice. The player is me. The game only ends after the player defeats the dragon king. Allow the player to view their inventory. Don’t let the player teleport to other locations (e.g. teleport directly to the battle with the dragon king). The amount of Gold the player has cannot be negative; if the player does not have enough gold to buy and item, don’t allow the player to buy it. Please do not respond for the player; you are the game master only.
    `;
    //function call to window.ai to generate text, using our streaming options
    try {
      await aiRef.current.generateText(
        {
          messages: [
            { role: "system", content: systemPrompt },
            ...updatedMessages,
          ],
        },
        streamingOptions
      );
    } catch (e) {
      toast.error("window.ai generation completion failed.");
      console.error(e);
    }
  }

  const startGame = async () => {
    if (!aiRef.current) {
      toast.custom(<InstallationToast />, {
        id: "window-ai-not-detected",
      });
      return;
    }

    handleNewMessage('Start Game');
    setIsGameStarted(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Head>
        <title>Fantasy Quest</title>
      </Head>
      <div className="w-full sm:w-3/4 lg:w-1/2 xl:w-1/2 bg-white shadow-lg rounded-lg p-6">
        <h1 className="text-3xl font-bold mb-4">Fantasy Quest x window.ai</h1>
        <p className="mt-4 mb-4">
          Works best with GPT-4 &#183; <a href="https://github.com/zoan37/fantasy-quest" target="_blank" style={{ color: "#89CFF0" }}>GitHub</a>
        </p>
        <div className="overflow-y-auto h-96 mb-4">
          {messages.map((message, index) => (
            index === 0 ? (
              <div></div>
            ) : (
              <div
                key={index}
                className={`mb-2 ${message.role === "user" ? "text-right" : ""}`}
              >
                <div
                  className={`inline-block p-2 rounded-lg text-left ${message.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-300 text-black"
                    }`}
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {message.content}
                </div>
              </div>
            )
          ))}
          <div ref={messagesEndRef}></div>
        </div>
        {
          isGameStarted ?
            (
              <form onSubmit={handleSendMessage} className="flex">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-grow border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className={`ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold ${loading ? "opacity-50" : ""
                    }`}
                >
                  {loading ? "Sending..." : "Send"}
                </button>
              </form>
            ) :
            (
              <div style={{ textAlign: 'center' }}>
                <button
                  type="submit"
                  onClick={() => startGame()}
                  className={`ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold ${loading ? "opacity-50" : ""
                    }`}
                  style={{ fontSize: '18px' }}
                >
                  Start Game
                </button>
              </div>
            )
        }
      </div>
      <Toaster />
    </div>
  );
};

export default App;