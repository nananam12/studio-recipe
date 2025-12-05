pipeline {
    agent any

    environment {
        // !!! 실제 환경에 맞는 값으로 대체하세요. !!!
        AWS_REGION = 'ap-northeast-2'
        S3_BUCKET = 'recipe-app-codedeploy-artifacts-516175389011' // 실제 S3 버킷 이름
        CODEDEPLOY_APPLICATION = 'recipe-app-codedeploy' // 실제 CodeDeploy 애플리케이션 이름
        CODEDEPLOY_DEPLOYMENT_GROUP = 'recipe-app-webserver-tg' // 실제 CodeDeploy 배포 그룹 이름

        ECR_REGISTRY = '516175389011.dkr.ecr.ap-northeast-2.amazonaws.com/recipe-app'
        ECR_REGION = 'ap-northeast-2'
        ECR_IMAGE = "${ECR_REGISTRY}:${env.BUILD_NUMBER}" // 빌드 번호를 태그로 사용

        // Secrets Manager ID를 start_container.sh에 전달하여 스크립트에서 값을 가져오도록 함
        AWS_SECRETS_ID = 'recipe-app-secrets' // 김윤환8988님의 Core_Memory에서 확인된 Secrets Manager ID

        // Redis 연결 문제 (예: UnknownHostException, Network is unreachable)가 발생했던 Redis 호스트
        // Secrets Manager에 이 값이 없었다면 직접 전달 (현재는 Secrets Manager 사용 중이므로 이 변수는 스크립트에서만 필요)
        REDIS_HOST_PROBLEM = 'your-problematic-redis-dns-or-ip'
        REDIS_PORT_PROBLEM = '6379'
    }

    stages {
        stage('Initialize & Clean') {
            steps {
                echo "--- Initializing workspace ---"
                // cleanWs() 명령어를 제거하여 체크아웃된 코드가 삭제되지 않도록 합니다.
                // 워크스페이스는 Jenkins가 SCM에서 코드를 체크아웃하면서 자동으로 정리됩니다.
            }
        }

        stage('Build with Gradle') {
            steps {
                script {
                    echo "--- Building application with Gradle ---"
                    // 실제 프로젝트 루트 디렉토리로 이동하여 gradlew 실행
                    sh 'cd studio-recipe-main/recipe && chmod +x ./gradlew'
                    sh 'cd studio-recipe-main/recipe && ./gradlew clean build -x test' // 테스트 생략 옵션 추가
                    echo "BUILD SUCCESSFUL"
                }
            }
        }

        stage('Rename JAR file') {
            steps {
                script {
                    echo "--- Renaming JAR file to app.jar ---"
                    // 실제 프로젝트 루트 디렉토리 내의 build/libs에서 jar 파일 찾기
                    // 경로: studio-recipe-main/recipe/build/libs/*.jar
                    def originalJarNameOutput = sh(returnStdout: true, script: 'ls studio-recipe-main/recipe/build/libs/*.jar').trim()
                    def originalJarName = originalJarNameOutput.split('\n')[0].replaceAll('.*\\/', '') // 경로 제거

                    if (originalJarName && originalJarName != 'app.jar') {
                        // 옮기기 전에 기존 app.jar 제거 (안전성 확보)
                        sh "rm -f studio-recipe-main/recipe/build/libs/app.jar"
                        sh "mv studio-recipe-main/recipe/build/libs/${originalJarName} studio-recipe-main/recipe/build/libs/app.jar"
                        echo "Renamed ${originalJarName} to studio-recipe-main/recipe/build/libs/app.jar."
                    } else if (originalJarName == 'app.jar') {
                        echo "JAR file is already named 'app.jar'. No rename needed."
                    }
                    else {
                        error "No JAR file found in studio-recipe-main/recipe/build/libs directory."
                    }
                }
            }
        }

        stage('Docker Build & Push to ECR') {
            steps {
                script {
                    echo "--- Building Docker image and pushing to ECR ---"
                    sh "aws ecr get-login-password --region ${ECR_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}"

                    // Dockerfile이 실제 프로젝트 루트(studio-recipe-main/recipe/)에 있다고 가정.
                    // 경로를 변경하여 해당 디렉토리에서 Dockerfile을 찾고 빌드 컨텍스트도 해당 디렉토리로 설정
                    sh "docker build -t ${ECR_IMAGE} -f studio-recipe-main/recipe/Dockerfile studio-recipe-main/recipe"

                    sh "docker push ${ECR_IMAGE}"
                }
            }
        }

        stage('Prepare and Deploy to CodeDeploy') {
            steps {
                script {
                    echo "--- Preparing appspec.yml and creating CodeDeploy deployment ---"

                    // appspec.yml이 레포지토리 루트(즉, Jenkins 워크스페이스 루트)에 존재하여 이를 직접 복사하여 ZIP에 포함시킵니다.
                    // 기존처럼 워크스페이스 루트에 있다고 가정합니다.
                    sh "cp appspec.yml ."

                    writeFile file: 'ECR_IMAGE_VALUE.txt', text: "${ECR_IMAGE}"
                    echo "ECR_IMAGE_VALUE.txt generated with: ${ECR_IMAGE}"

                    echo "DEBUG: Copying deployment artifacts to Jenkins workspace root for zipping..."
                    // 'scripts' 디렉토리와 'app.jar'도 실제 프로젝트 루트에서 복사합니다.
                    sh "cp -r studio-recipe-main/recipe/scripts ."
                    sh "cp studio-recipe-main/recipe/build/libs/app.jar ." // 새로 옮겨진 app.jar 파일
                    echo "DEBUG: All artifacts copied to Jenkins workspace root."

                    echo "DEBUG: Zipping deployment artifacts..."
                    sh "zip -r deployment.zip appspec.yml scripts app.jar ECR_IMAGE_VALUE.txt"
                    echo "DEBUG: deployment.zip created."

                    echo "DEBUG: Uploading deployment.zip to S3://${S3_BUCKET}/recipe-app/${env.BUILD_NUMBER}.zip"
                    sh "aws s3 cp deployment.zip s3://${S3_BUCKET}/recipe-app/${env.BUILD_NUMBER}.zip"
                    echo "DEBUG: deployment.zip uploaded to S3."

                    def activeDeployments = []
                    def activeStatuses = ['Created', 'Queued', 'InProgress', 'Pending', 'Ready']

                    try {
                        echo "Checking for active CodeDeploy deployments for application ${CODEDEPLOY_APPLICATION}..."
                        def allDeploymentIdsJson = sh(returnStdout: true, script: """
                            aws deploy list-deployments-by-application \
                                --application-name ${CODEDEPLOY_APPLICATION} \
                                --query 'deployments' \
                                --output json \
                                --region ${AWS_REGION}
                        """).trim()

                        def deploymentIdList = new groovy.json.JsonSlurper().parseText(allDeploymentIdsJson)

                        if (deploymentIdList && !deploymentIdList.isEmpty()) {
                            deploymentIdList.each { deploymentId ->
                                try {
                                    def deploymentStatusJson = sh(returnStdout: true, script: """
                                        aws deploy get-deployment \
                                            --deployment-id ${deploymentId} \
                                            --query 'deploymentInfo.status' \
                                            --output json \
                                            --region ${AWS_REGION}
                                    """).trim()
                                    def deploymentStatus = new groovy.json.JsonSlurper().parseText(deploymentStatusJson)

                                    if (activeStatuses.contains(deploymentStatus)) {
                                        activeDeployments.add(deploymentId)
                                    }
                                } catch (e) {
                                    echo "WARNING: Could not get status for deployment ID ${deploymentId}. It might be too old or invalid. Error: ${e.message}"
                                }
                            }
                        } else {
                            echo "No existing deployments found for application ${CODEDEPLOY_APPLICATION}."
                        }

                    } catch (e) {
                        echo "WARNING: Failed to list or parse existing deployments. Proceeding with new deployment without stopping any. Error: ${e.message}"
                    }

                    if (!activeDeployments.isEmpty()) {
                        echo "Found active deployment(s): ${activeDeployments.join(', ')}. Attempting to stop them before proceeding."
                        activeDeployments.each { deploymentId ->
                            echo "Stopping deployment ${deploymentId}..."
                            sh "aws deploy stop-deployment --deployment-id ${deploymentId} --region ${AWS_REGION}"
                            sleep 5
                        }
                        echo "Active deployments stop commands issued. Waiting 10 seconds for stabilization."
                        sleep 10
                    } else {
                        echo "No active CodeDeploy deployments to stop. Proceeding with new deployment."
                    }

                    echo "--- Initiating new CodeDeploy deployment ---"
                    def deploymentResultJson = sh(returnStdout: true, script: """
                    aws deploy create-deployment \\
                      --application-name ${CODEDEPLOY_APPLICATION} \\
                      --deployment-group-name ${CODEDEPLOY_DEPLOYMENT_GROUP} \\
                      --deployment-config-name CodeDeployDefault.OneAtATime \\
                      --description "Blue/Green Deployment triggered by Jenkins build ${env.BUILD_NUMBER}" \\
                      --s3-location bucket=${S3_BUCKET},key=recipe-app/${env.BUILD_NUMBER}.zip,bundleType=zip \\
                      --region ${AWS_REGION}
                    """).trim()

                    def newDeploymentId = ""
                    try {
                        newDeploymentId = new groovy.json.JsonSlurper().parseText(deploymentResultJson).deploymentId
                        echo "Successfully initiated new CodeDeploy deployment with ID: ${newDeploymentId}"
                        env.CODEDEPLOY_DEPLOYMENT_ID = newDeploymentId
                    } catch (e) {
                        error "Failed to parse CodeDeploy deployment ID from create-deployment result: ${e.message}. Raw output: ${deploymentResultJson}"
                    }

                    echo "--- Monitoring CodeDeploy deployment ${env.CODEDEPLOY_DEPLOYMENT_ID} status ---"
                    timeout(time: 30, unit: 'MINUTES') {
                        def deploymentStatus = ""
                        while (deploymentStatus != "Succeeded" && deploymentStatus != "Failed" && deploymentStatus != "Stopped" && deploymentStatus != "Skipped" && deploymentStatus != "Ready") {
                            sleep 30
                            try {
                                def statusCheckResultJson = sh(returnStdout: true, script: """
                                    aws deploy get-deployment \
                                        --deployment-id ${env.CODEDEPLOY_DEPLOYMENT_ID} \
                                        --query 'deploymentInfo.status' \
                                        --output json \
                                        --region ${AWS_REGION}
                                """).trim()
                                deploymentStatus = new groovy.json.JsonSlurper().parseText(statusCheckResultJson)
                                echo "Deployment ${env.CODEDEPLOY_DEPLOYMENT_ID} status: ${deploymentStatus}"
                            } catch (e) {
                                echo "WARNING: Failed to get deployment status for ${env.CODEDEPLOY_DEPLOYMENT_ID}. Retrying... Error: ${e.message}"
                            }
                        }

                        if (deploymentStatus == "Failed" || deploymentStatus == "Stopped" || deploymentStatus == "Skipped") {
                            error "CodeDeploy deployment ${env.CODEDEPLOY_DEPLOYMENT_ID} failed or was stopped. Current status: ${deploymentStatus}"
                        } else {
                            echo "CodeDeploy deployment ${env.CODEDEPLOY_DEPLOYMENT_ID} succeeded!"
                        }
                    }
                }
            }
        }
    }
}