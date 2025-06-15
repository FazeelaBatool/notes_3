pipeline {
    agent any

    environment {
        COMPOSE_FILE = 'docker-compose.ci.yml'
    }

    stages {
        stage('Clone Repo') {
            steps {
                git 'https://github.com/FazeelaBatool/notes_test'
            }
        }

        stage('Build and Run App + Tests') {
            steps {
                script {
                    sh "docker-compose -f ${COMPOSE_FILE} up --abort-on-container-exit"
                }
            }
        }
    }

    post {
        always {
            sh "docker-compose -f ${COMPOSE_FILE} down"
        }
        success {
            echo "✅ App built and tests passed!"
        }
        failure {
            echo "❌ Tests failed. See above for logs."
        }
    }
}
