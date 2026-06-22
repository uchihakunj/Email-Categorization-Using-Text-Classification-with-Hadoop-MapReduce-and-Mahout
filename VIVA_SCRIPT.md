# Viva Script: Email Categorization Using Hadoop + Mahout

Use this as a spoken script during the viva or demo. It follows the same order as the dashboard pages and keeps the project story connected from raw email data to model output, feedback, and exported artifacts.

## 1. Opening

"Good morning. My project is called Email Categorization Using Hadoop and Mahout. The main goal is to classify incoming emails into categories like Spam and Important using a big-data pipeline. I built the system so that it starts from raw email files, processes them with Hadoop MapReduce, trains a Naive Bayes model with Mahout, and then shows the results in a dashboard for easy monitoring and testing."

"The reason I chose this problem is that email filtering is a practical machine learning task, and it also fits well with distributed processing. Instead of doing everything in a single script, I designed the project as a complete pipeline so I can show data ingestion, preprocessing, training, inference, and feedback in one flow."

## 2. Overview Page

"This is the overview page. Here I am showing the final performance summary of the system in a simple control-room style view. The key metrics on top represent accuracy, spam precision, spam recall, and spam F1 score, so this page gives a quick snapshot of how well the model is performing."

"I kept this page as the starting point because viva examiners usually want the main result first. From here, I can immediately explain that the model is not just trained, but also monitored like a real classification service. The buttons on the top are there to generate reports, switch theme, and jump to recent runs if needed."

## 3. Datasets Page

"This page is for analyzing a single email. I can enter the sender, subject, and body, or use the built-in demo examples for spam, important, or finance emails. This helps me test the classifier quickly without preparing a new file every time."

"When I click analyze, the system sends the email text to the API and returns the predicted category, risk score, confidence, and signal words. The reason this page is important is that it shows the practical use of the model on real text. I can also submit the correct label as feedback, which helps store labeled examples for future improvement."

"At the bottom, there is a recent feedback log. This is useful because it shows that the system is not isolated; it keeps track of predictions and human corrections. In other words, the dashboard supports a feedback loop, which is important in a real classification system."

## 4. Pipelines Page

"This is the most important technical page because it explains the full workflow. On the left side, the training lane shows the flow from raw email corpus to HDFS ingest, then MapReduce preprocessing, then Seq2Sparse and TF-IDF vectorization, and finally Naive Bayes training and testing. This is the exact path that turns raw emails into a usable model."

"On the right side, the inference lane shows how the trained artifacts are used later. The system loads the model from the artifacts cache, classifies a new email through the API, displays dashboard insights, and then uses feedback to refine the overall reporting. So this page connects the offline training part with the online prediction part."

"The confusion matrix in the middle helps explain where the model is making correct and incorrect predictions. The class balance chart below it shows how many emails are marked as Important and Spam. If live feedback is available, I can switch to that view to show updated metrics from the labels collected during use."

## 5. Models Page

"This page shows recent model runs. Each row contains the run ID, date, model type, and status. I use this page to demonstrate that the project keeps track of multiple executions instead of only one final result."

"The reason this matters is reproducibility. In a viva, I can explain that I am not only training a model once, but also recording the experiment history so that future runs can be compared. The statuses help indicate whether a run is healthy or needs review."

## 6. Model Comparison

"If I am asked why I used Naive Bayes, I explain that email classification is a text-heavy problem, and Naive Bayes works very well for sparse word features. It is fast to train, easy to interpret, and gives strong baseline accuracy for spam detection."

"I can compare it with Logistic Regression by saying that Logistic Regression often gives very good accuracy too, especially when we have enough training data and well-tuned features. However, it usually needs more tuning and is a bit heavier than Naive Bayes for a simple baseline pipeline."

"Compared with Support Vector Machines, Naive Bayes is simpler and faster. SVMs can perform well on text classification, but they are usually more expensive to train and explain. For a Hadoop and Mahout demo, Naive Bayes is a more practical choice because the focus is on the full pipeline, not only on a complex classifier."

"Compared with Decision Trees or Random Forests, Naive Bayes is usually better suited for high-dimensional text features. Tree-based models are very good for structured data, but for email text they can become less efficient and less natural than probabilistic text classifiers."

"So the final reason for choosing Naive Bayes is that it gives a good balance of speed, simplicity, and performance. It fits the idea of a scalable text classification system and matches the goal of showing Hadoop preprocessing and Mahout-based model training in a clean end-to-end workflow."

## 7. Batch Upload Page

"This page is for bulk classification. Instead of analyzing one email at a time, I can upload a CSV or folder export and classify many emails together. This is useful for practical deployment because businesses usually process messages in batches."

"The page also shows the required CSV format, which expects sender, subject, and body columns. I included a demo CSV download so the user can test the feature immediately. After upload, the system shows a summary of how many emails were processed and how many were labeled as Spam or Important, along with a row-by-row result table."

"This page demonstrates scalability from a user point of view. Even though the backend is based on Hadoop and Mahout, the dashboard makes the process simple and accessible."

## 8. Alerts Page

"This page gives short insights from the model and preprocessing pipeline. For example, it shows the impact of stemming and the current alert surface. I use this page to communicate that the system is not only generating predictions, but also monitoring quality signals."

"In simple words, this page helps me explain what changed after preprocessing. If the stemmer reduces token count and the model variance becomes tighter, that means the text normalization step is helping the classifier focus on more meaningful terms."

## 9. Exports Page

"This page lists the exported artifacts. The stem metrics file and the Naive Bayes output are shown here so I can demonstrate that the pipeline produces reusable outputs, not just temporary console logs."

"This is important because the trained model can be reused for faster inference. In the project setup, the API prefers the exported artifacts when they are available, which makes the dashboard faster and easier to run without repeatedly depending on HDFS."

## 10. Closing

"To conclude, this project combines Hadoop for distributed preprocessing, Mahout for model training, and a React dashboard for analysis and visualization. The whole system takes raw emails, cleans and vectorizes them, trains a Naive Bayes classifier, and then exposes the results through a clear user interface."

"So the main contribution of the project is not just classification accuracy, but the complete end-to-end workflow from raw data to model, feedback, and exported artifacts. Thank you, and I’m happy to answer questions about any part of the pipeline."

## Quick Rehearsal Flow

If you want a short speaking order, use this sequence:

1. Introduce the project goal and why email categorization matters.
2. Open the Overview page and mention the headline metrics.
3. Move to Datasets and show single-email prediction plus feedback.
4. Explain Pipelines to connect preprocessing, training, and inference.
5. Show Models for run history and repeatability.
6. Demonstrate Batch Upload for bulk classification.
7. Mention Alerts as the insight and quality-monitoring page.
8. End with Exports and the final conclusion.
