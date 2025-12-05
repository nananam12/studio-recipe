import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaThList, FaStar, FaCommentDots, FaBookOpen, FaSearch, FaHeart } from 'react-icons/fa';
import api from '../api/axios'; 
import DeleteModal from '../components/DeleteModal';
import './MyPage.css'; 

function MyPage() {
  const navigate = useNavigate();
  
  const [userInfo, setUserInfo] = useState(null); 
  const [likedList, setLikedList] = useState([]); 
  const [savedList, setSavedList] = useState([]);
  const [authoredList, setAuthoredList] = useState([]); 
  
  const [activeMenu, setActiveMenu] = useState('editProfile');
  const [subTab, setSubTab] = useState('draft');

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // 냉장고 재료 관련 state
  const [ingredients, setIngredients] = useState([]);
  const [newIngredient, setNewIngredient] = useState({ name: '', quantity: '', unit: '', memo: '' });
  const [recommendedRecipes, setRecommendedRecipes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const recipesPerPage = 5;
  
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return; 
    }

    const fetchMyPageData = async () => {
      try {
        // 1. 기본 마이페이지 정보 조회
        const response = await api.get('/api/mypages/me'); 
        const data = response.data;
        
        console.log('✅ API 응답:', data);

        setUserInfo(data.userInfo);
        const liked = data.likedList || [];
        setLikedList(liked);
        
        console.log('📦 좋아요한 레시피:', liked.length, '개');
        if (liked.length > 0) {
          console.log('📋 첫 번째 레시피:', liked[0]);
        }
        
        // 2. 내가 작성한 레시피 별도 조회
        const myRecipesResponse = await api.get('/api/mypages/my-recipes');
        console.log('✅ 내가 작성한 레시피:', myRecipesResponse.data);
        setAuthoredList(myRecipesResponse.data || []);

        // 3. 찜한 레시피 별도 조회
        const bookmarkedResponse = await api.get('/api/mypages/bookmarked-recipes');
        console.log('✅ 찜한 레시피:', bookmarkedResponse.data);
        setSavedList(bookmarkedResponse.data || []);

        // 4. 냉장고 재료 조회
        const ingredientsResponse = await api.get('/api/mypages/ingredients');
        console.log('✅ 냉장고 재료:', ingredientsResponse.data);
        setIngredients(ingredientsResponse.data || []);
        
        // ✅ 5. 재료 기반 추천 레시피 조회 (재료가 있을 때만)
        if (ingredientsResponse.data && ingredientsResponse.data.length > 0) {
          const recipesResponse = await api.get('/api/mypages/recommended-recipes');
          console.log('✅ 재료 기반 추천 레시피:', recipesResponse.data);
          setRecommendedRecipes(recipesResponse.data || []);
        }
      
      } catch (error) {
        console.error('❌ 마이페이지 정보 조회 실패:', error);
        alert('정보를 불러오는 데 실패했습니다. 다시 로그인해주세요.');
        localStorage.removeItem('accessToken'); 
        navigate('/login');
      }
    };
    
    fetchMyPageData();
  }, [navigate]); 

  const handleGoToWritePage = () => {
    navigate('/recipe/write'); 
  };

  // 재료 추가 함수
  const handleAddIngredient = async () => {
    if (!newIngredient.name.trim()) {
      alert('재료 이름을 입력해주세요.');
      return;
    }

    try {
      const response = await api.post('/api/mypages/ingredients', newIngredient);
      setIngredients([...ingredients, response.data]);
      setNewIngredient({ name: '', quantity: '', unit: '', memo: '' });
      alert('재료가 추가되었습니다.');
      
      // 재료 기반 레시피 추천 조회
      fetchRecommendedRecipes();
    } catch (error) {
      console.error('재료 추가 실패:', error);
      alert('재료 추가에 실패했습니다.');
    }
  };

  // 재료 삭제 함수
  const handleDeleteIngredient = async (ingredientId) => {
    try {
      await api.delete(`/api/mypages/ingredients/${ingredientId}`);
      setIngredients(ingredients.filter(item => item.id !== ingredientId));
      alert('재료가 삭제되었습니다.');
      fetchRecommendedRecipes();
    } catch (error) {
      console.error('재료 삭제 실패:', error);
      alert('재료 삭제에 실패했습니다.');
    }
  };

  // 재료 기반 레시피 추천 조회
  const fetchRecommendedRecipes = async () => {
    try {
      const response = await api.get('/api/mypages/recommended-recipes');
      console.log('🔄 추천 레시피 갱신:', response.data);
      setRecommendedRecipes(response.data || []);
      setCurrentPage(1); // 페이지 초기화
    } catch (error) {
      console.error('추천 레시피 조회 실패:', error);
    }
  };

  // 페이지네이션 계산
  const indexOfLastRecipe = currentPage * recipesPerPage;
  const indexOfFirstRecipe = indexOfLastRecipe - recipesPerPage;
  const currentRecipes = recommendedRecipes.slice(indexOfFirstRecipe, indexOfLastRecipe);
  const totalPages = Math.ceil(recommendedRecipes.length / recipesPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  // recipeId를 안전하게 가져오는 함수
  const getRecipeId = (recipe) => {
    return recipe.recipeId || recipe.rcpSno || recipe.id;
  };

  // 필드명 호환성 함수들
  const getTitle = (recipe) => recipe.title || recipe.rcpTtl || '제목 없음';
  const getImageUrl = (recipe) => {
  const imageUrl = recipe.imageUrl || recipe.rcpImgUrl;
  
  if (!imageUrl) {
    return '/default-image.jpg';
  }
  
  // 이미 완전한 URL인 경우
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // /studio-recipe/images/로 시작하는 경우
  if (imageUrl.startsWith('/studio-recipe/')) {
    return `http://localhost:8080${imageUrl}`;
  }
  
  // /images/로 시작하는 경우 ⭐ 요게 핵심!
  if (imageUrl.startsWith('/images/')) {
    return `http://localhost:8080/studio-recipe${imageUrl}`;
  }
  
  // images/로 시작하는 경우
  if (imageUrl.startsWith('images/')) {
    return `http://localhost:8080/studio-recipe/${imageUrl}`;
  }
  
  // 그 외
  return `http://localhost:8080/studio-recipe/images/${imageUrl}`;
};
  const getViewCount = (recipe) => recipe.viewCount || recipe.inqCnt || 0;
  const getLikeCount = (recipe) => recipe.likeCount || recipe.rcmmCnt || 0;

  const handleRecipeClick = (recipe) => {
    const recipeId = getRecipeId(recipe);
    if (!recipeId) {
      console.error('❌ recipeId를 찾을 수 없습니다:', recipe);
      alert('레시피 정보를 불러올 수 없습니다.');
      return;
    }
    console.log('🔗 레시피 클릭:', recipeId);
    navigate(`/details/${recipeId}`);
  };

  const handleOpenDeleteModal = () => {
    setIsDeleteModalOpen(true);
  };

  const handleDeleteAccount = async (password) => {
    try {
      await api.delete('/api/user/delete', {
        data: { password: password }
      });

      alert('회원 탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.');
      setIsDeleteModalOpen(false);
      
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      navigate('/');
      window.location.reload();

    } catch (error) {
      console.error('탈퇴 실패:', error);
      if (error.response && error.response.status === 400) {
        alert('비밀번호가 일치하지 않습니다.');
      } else {
        alert('회원 탈퇴 중 오류가 발생했습니다.');
      }
    }
  };
  
  if (!userInfo) {
    return <div className="loading-container">마이페이지 정보를 불러오는 중...</div>; 
  }
  
  const renderContent = () => {
    switch (activeMenu) {
      
      case 'editProfile':
        return (
          <div className="profile-edit-container">
            <h2>회원정보 수정</h2>
            <div className="profile-form">
              
              <div className="form-row">
                <span className="form-label">아이디(이메일)</span>
                <div className="form-value-wrapper">
                  <span className="form-value">{userInfo.email}</span>
                </div>
              </div>

              <div className="form-row">
                <span className="form-label">이름</span>
                <div className="form-value-wrapper">
                  <span className="form-value">{userInfo.name}</span>
                </div>
              </div>

              <div className="form-row"> 
                <span className="form-label">닉네임</span>
                <div className="form-value-wrapper">
                  <span className="form-value">{userInfo.nickname}</span>
                </div>
              </div>

              <div className="form-row">
                <span className="form-label">비밀번호 변경</span>
                <div className="form-value-wrapper">
                  <p className="info-text" style={{ marginBottom: '10px', color: '#666', fontSize: '14px' }}>
                    보안을 위해 비밀번호 변경은 이메일 인증 후 가능합니다.
                  </p>
                  <button 
                    type="button" 
                    className="btn-full-width"
                    style={{ backgroundColor: '#6c757d', border: 'none' }}
                    onClick={() => navigate('/find-password')}
                  >
                    비밀번호 재설정 하러 가기
                  </button>
                </div>
              </div>

            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={() => navigate('/')}>나가기</button>
              <button type="button" className="btn-danger" onClick={handleOpenDeleteModal}>회원탈퇴</button>
            </div>
          </div>
        );

      case 'myIngredients':
        return (
          <div className="my-ingredients-container">
            <h2><FaStar /> 나의 냉장고 재료</h2>
            <p>내가 가진 재료를 등록하고 관리합니다.</p>
            
{/* 재료 등록 폼 - 개선 버전 */}
<div className="ingredient-form" style={{ 
  background: '#f8f9fa',
  padding: '25px',
  borderRadius: '8px',
  marginTop: '20px',
  marginBottom: '30px'
}}>
  <h3 style={{ 
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }}>
    <span style={{ 
      background: '#4CAF50',
      color: 'white',
      width: '24px',
      height: '24px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px'
    }}>1</span>
    재료 정보
  </h3>
  
  <div style={{ 
    display: 'flex', 
    gap: '12px', 
    alignItems: 'stretch',
    marginBottom: '15px'
  }}>
    <input 
      type="text" 
      placeholder="재료 이름 (예: 돼지고기)" 
      value={newIngredient.name}
      onChange={(e) => setNewIngredient({...newIngredient, name: e.target.value})}
      onKeyPress={(e) => e.key === 'Enter' && handleAddIngredient()}
      style={{ 
        flex: 2.5,
        padding: '12px 16px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '15px',
        background: 'white'
      }}
    />
    <input 
      type="text" 
      placeholder="수량" 
      value={newIngredient.quantity}
      onChange={(e) => setNewIngredient({...newIngredient, quantity: e.target.value})}
      onKeyPress={(e) => e.key === 'Enter' && handleAddIngredient()}
      style={{ 
        flex: 1,
        padding: '12px 16px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '15px',
        background: 'white'
      }}
    />
    <input 
      type="text" 
      placeholder="단위" 
      value={newIngredient.unit}
      onChange={(e) => setNewIngredient({...newIngredient, unit: e.target.value})}
      onKeyPress={(e) => e.key === 'Enter' && handleAddIngredient()}
      style={{ 
        flex: 1,
        padding: '12px 16px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '15px',
        background: 'white'
      }}
    />
    <input 
      type="text" 
      placeholder="비고 (선택사항)" 
      value={newIngredient.memo}
      onChange={(e) => setNewIngredient({...newIngredient, memo: e.target.value})}
      onKeyPress={(e) => e.key === 'Enter' && handleAddIngredient()}
      style={{ 
        flex: 2,
        padding: '12px 16px',
        border: '1px solid #ddd',
        borderRadius: '6px',
        fontSize: '15px',
        background: 'white'
      }}
    />
    <button 
      onClick={handleAddIngredient}
      style={{ 
        padding: '12px 24px',
        background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '15px',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.2s'
      }}
      onMouseOver={(e) => {
        e.target.style.transform = 'translateY(-1px)';
        e.target.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
      }}
      onMouseOut={(e) => {
        e.target.style.transform = 'translateY(0)';
        e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      }}
    >
      + 재료 추가
    </button>
  </div>

  {/* 등록된 재료 목록 */}
  {ingredients.length > 0 && (
    <div style={{ 
      marginTop: '25px',
      paddingTop: '20px',
      borderTop: '1px solid #e0e0e0'
    }}>
      <h4 style={{ 
        fontSize: '16px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '15px'
      }}>
        등록된 재료 ({ingredients.length}개)
      </h4>
      <div style={{ 
        display: 'flex',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        {ingredients.map(item => (
          <div 
            key={item.id} 
            style={{ 
              padding: '10px 16px',
              background: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = '#4CAF50';
              e.currentTarget.style.boxShadow = '0 3px 6px rgba(0,0,0,0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = '#e0e0e0';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
            }}
          >
            <span style={{ 
              fontSize: '14px',
              color: '#333',
              fontWeight: '500'
            }}>
              {item.name} {item.quantity}{item.unit}
              {item.memo && <span style={{ color: '#999', fontSize: '13px' }}> ({item.memo})</span>}
            </span>
            <button 
              onClick={() => handleDeleteIngredient(item.id)}
              style={{ 
                background: 'none',
                border: 'none',
                color: '#999',
                cursor: 'pointer',
                fontSize: '20px',
                lineHeight: '1',
                padding: '0',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#f44336';
                e.target.style.color = 'white';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'none';
                e.target.style.color = '#999';
              }}
              title="삭제"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )}
</div>

            {/* 추천 레시피 */}
            {ingredients.length > 0 && (
              <div className="recommended-recipes">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h3><FaHeart style={{ color: '#ff6b6b' }} /> 내가 등록한 재료로 만들 수 있는 레시피</h3>
                </div>

                {recommendedRecipes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                    <p>등록된 재료로 만들 수 있는 레시피를 찾는 중...</p>
                    <p style={{ fontSize: '14px', marginTop: '10px' }}>레시피가 없다면 재료를 더 추가해보세요!</p>
                  </div>
                ) : (
                  <>
                    <div className="recipes-grid">
                      {currentRecipes.map(recipe => (
                        <div 
                          key={getRecipeId(recipe)} 
                          className="recipe-card" 
                          onClick={() => handleRecipeClick(recipe)}
                        >
                          <div className="recipe-image-wrapper">
                            <img src={getImageUrl(recipe)} alt={getTitle(recipe)} />
                          </div>
                          <div className="recipe-info">
                            <h4>{getTitle(recipe)}</h4>
                            <div className="recipe-stats">
                              <span>👁️ {getViewCount(recipe)}</span>
                              <span>❤️ {getLikeCount(recipe)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 페이지네이션 */}
                    {totalPages > 1 && (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        gap: '5px',
                        marginTop: '30px'
                      }}>
                        <button 
                          onClick={() => handlePageChange(1)}
                          disabled={currentPage === 1}
                          style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #ddd', 
                            background: 'white',
                            borderRadius: '4px',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            opacity: currentPage === 1 ? 0.5 : 1
                          }}
                        >
                          처음
                        </button>
                        <button 
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #ddd', 
                            background: 'white',
                            borderRadius: '4px',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            opacity: currentPage === 1 ? 0.5 : 1
                          }}
                        >
                          이전
                        </button>
                        
                        {[...Array(totalPages)].map((_, index) => {
                          const pageNum = index + 1;
                          if (
                            pageNum === 1 ||
                            pageNum === totalPages ||
                            (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                style={{
                                  padding: '8px 12px',
                                  border: '1px solid #ddd',
                                  background: currentPage === pageNum ? '#4CAF50' : 'white',
                                  color: currentPage === pageNum ? 'white' : 'black',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontWeight: currentPage === pageNum ? 'bold' : 'normal'
                                }}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                          return null;
                        })}

                        <button 
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #ddd', 
                            background: 'white',
                            borderRadius: '4px',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            opacity: currentPage === totalPages ? 0.5 : 1
                          }}
                        >
                          다음
                        </button>
                        <button 
                          onClick={() => handlePageChange(totalPages)}
                          disabled={currentPage === totalPages}
                          style={{ 
                            padding: '8px 12px', 
                            border: '1px solid #ddd', 
                            background: 'white',
                            borderRadius: '4px',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            opacity: currentPage === totalPages ? 0.5 : 1
                          }}
                        >
                          마지막
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );

      case 'registerRecipe':
      case 'myAuthoredRecipes':
        return (
          <>
            <div className="tabs">
              <span className={`tab-item ${subTab === 'public' ? 'active' : ''}`} onClick={() => setSubTab('public')}>공개중</span>
              <span className={`tab-item ${subTab === 'draft' ? 'active' : ''}`} onClick={() => setSubTab('draft')}>작성중</span>
            </div>
            {subTab === 'draft' && (
              <div className="empty-state">
                <div className="profile-pic">{userInfo.nickname.charAt(0).toUpperCase()}</div>
                <h3>레시피를 직접 올려보세요!</h3>
                <p>자랑하고 싶은 나만의 레시피! 공유하고 싶은 멋진 레시피를 올려 주세요.</p>
                <button className="register-btn" onClick={handleGoToWritePage}>레시피 등록하기</button>
              </div>
            )}
            {subTab === 'public' && ( 
              <div className="recipes-grid-container">
                <p className="recipe-count">공개 레시피: {authoredList.length}개</p>
                {authoredList.length === 0 ? (
                  <div className="empty-message">
                    <p>작성한 레시피가 없습니다.</p>
                  </div>
                ) : (
                  <div className="recipes-grid">
                    {authoredList.map(recipe => (
                      <div 
                        key={getRecipeId(recipe)} 
                        className="recipe-card" 
                        onClick={() => handleRecipeClick(recipe)}
                      >
                        <div className="recipe-image-wrapper">
                          <img src={getImageUrl(recipe)} />
                        </div>
                        <div className="recipe-info">
                          <h4>{recipe.title || recipe.rcpTtl}</h4>
                          <div className="recipe-stats">
                            <span>👁️ {recipe.viewCount || recipe.inqCnt || 0}</span>
                            <span>❤️ {recipe.likeCount || recipe.rcmmCnt || 0}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div> 
            )}
            <div className="recipe-search">
              <input type="text" placeholder="내가 작성한 레시피 검색" />
              <button><FaSearch /></button>
            </div>
          </>
        );

      case 'likedRecipes':
        return (
          <div className="recipes-list-container">
            <h2><FaHeart className="icon-heart" /> 좋아요 누른 레시피</h2>
            <p className="recipe-count">좋아요 누른 레시피: {likedList.length}개</p>
            
            {likedList.length === 0 ? (
              <div className="empty-message">
                <FaHeart className="empty-icon" />
                <p>좋아요 누른 레시피가 없습니다.</p>
                <p className="sub-message">마음에 드는 레시피에 좋아요를 눌러보세요!</p>
              </div>
            ) : (
              <div className="recipes-grid">
                {likedList.map(recipe => (
                  <div 
                    key={getRecipeId(recipe)} 
                    className="recipe-card" 
                    onClick={() => handleRecipeClick(recipe)}
                  >
                    <div className="recipe-image-wrapper">
                      <img src={getImageUrl(recipe)} />
                      <div className="like-badge">
                        <FaHeart />
                      </div>
                    </div>
                    <div className="recipe-info">
                      <h4>{recipe.title || recipe.rcpTtl}</h4>
                      <div className="recipe-stats">
                        <span>👁️ {recipe.viewCount || recipe.inqCnt || 0}</span>
                        <span>❤️ {recipe.likeCount || recipe.rcmmCnt || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'savedRecipes':
        return (
          <div className="recipes-list-container">
            <h2><FaStar className="icon-star" /> 찜한 레시피</h2>
            <p className="recipe-count">찜한 레시피: {savedList.length}개</p>
            
            {savedList.length === 0 ? (
              <div className="empty-message">
                <FaStar className="empty-icon" />
                <p>찜한 레시피가 없습니다.</p>
                <p className="sub-message">나중에 만들어볼 레시피를 찜해보세요!</p>
              </div>
            ) : (
              <div className="recipes-grid">
                {savedList.map(recipe => (
                  <div 
                    key={getRecipeId(recipe)} 
                    className="recipe-card" 
                    onClick={() => handleRecipeClick(recipe)}
                  >
                    <div className="recipe-image-wrapper">
                      <img src={getImageUrl(recipe)} alt={getTitle(recipe)} />
                      <div className="saved-badge">
                        <FaStar />
                      </div>
                    </div>
                    <div className="recipe-info">
                      <h4>{recipe.title || recipe.rcpTtl}</h4>
                      <div className="recipe-stats">
                        <span>👁️ {recipe.viewCount || recipe.inqCnt || 0}</span>
                        <span>❤️ {recipe.likeCount || recipe.rcmmCnt || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return <div className="profile-edit-container"><h2>나의 정보 수정</h2></div>;
    }
  };

  return (
    <div className="mypage-container">
      <nav className="mypage-nav">
        <button className={`nav-item ${activeMenu === 'editProfile' ? 'active' : ''}`} onClick={() => setActiveMenu('editProfile')}>
          <FaThList /> 나의 정보 수정
        </button>
        <button className={`nav-item ${activeMenu === 'myIngredients' ? 'active' : ''}`} onClick={() => setActiveMenu('myIngredients')}>
          <FaStar /> 나의 냉장고 재료 등록하기
        </button>
        <button className={`nav-item ${activeMenu === 'registerRecipe' ? 'active' : ''}`} onClick={() => setActiveMenu('registerRecipe')}>
          <FaCommentDots /> 레시피 등록하기 
        </button>
        <button className={`nav-item ${activeMenu === 'likedRecipes' ? 'active' : ''}`} onClick={() => setActiveMenu('likedRecipes')}>
          <FaHeart /> 좋아요 누른 레시피들 
        </button>
        <button className={`nav-item ${activeMenu === 'savedRecipes' ? 'active' : ''}`} onClick={() => setActiveMenu('savedRecipes')}>
          <FaStar /> 찜한 레시피들 
        </button>
        <button className={`nav-item ${activeMenu === 'myAuthoredRecipes' ? 'active' : ''}`} onClick={() => setActiveMenu('myAuthoredRecipes')}>
          <FaBookOpen /> 내가 작성한 레시피
        </button>
      </nav>

      <div className="mypage-content">
        {renderContent()}
      </div>

      <DeleteModal 
        isOpen={isDeleteModalOpen} 
        onClose={() => setIsDeleteModalOpen(false)} 
        onConfirm={handleDeleteAccount} 
      />
    </div>
  );
}

export default MyPage;